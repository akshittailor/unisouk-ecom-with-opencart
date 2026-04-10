import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { InventoryService } from './inventory.service';
import { OpenCartClientService } from '../../integrations/opencart/opencart.service';

describe('InventoryService', () => {
  let service: InventoryService;

  const openCartClientService = {
    getOrder: jest.fn(),
    getInventory: jest.fn(),
    updateInventory: jest.fn(),
  };

  const configService = {
    get: jest.fn((key: string, fallback: unknown) => {
      if (key === 'app.inventory.negativeStockPolicy') {
        return 'reject';
      }

      if (key === 'app.inventory.lowStockThreshold') {
        return 5;
      }

      return fallback;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: OpenCartClientService, useValue: openCartClientService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = moduleRef.get(InventoryService);
  });

  it('deducts base stock when order line has no variant selections', async () => {
    openCartClientService.getOrder.mockResolvedValue({
      orderId: 1,
      status: 'processing',
      products: [
        {
          productId: 100,
          name: 'T-Shirt',
          quantity: 3,
        },
      ],
    });

    openCartClientService.getInventory.mockResolvedValue([
      {
        productId: 100,
        name: 'T-Shirt',
        quantity: 10,
      },
    ]);

    await service.applyOrderDeduction(1);

    expect(openCartClientService.updateInventory).toHaveBeenCalledWith(100, 7);
  });

  it('deducts variant stock at option value level', async () => {
    openCartClientService.getOrder.mockResolvedValue({
      orderId: 2,
      status: 'processing',
      products: [
        {
          productId: 200,
          name: 'Sneakers',
          quantity: 2,
          selectedOptionValueIds: [5001],
        },
      ],
    });

    openCartClientService.getInventory.mockResolvedValue([
      {
        productId: 200,
        name: 'Sneakers',
        quantity: 50,
        options: [
          {
            optionId: 12,
            name: 'Size',
            values: [
              {
                optionValueId: 5001,
                name: '42',
                quantity: 9,
              },
            ],
          },
        ],
      },
    ]);

    await service.applyOrderDeduction(2);

    expect(openCartClientService.updateInventory).toHaveBeenCalledWith(200, 7, 5001);
  });

  it('throws for negative stock when policy is reject', async () => {
    openCartClientService.getOrder.mockResolvedValue({
      orderId: 3,
      status: 'processing',
      products: [
        {
          productId: 300,
          name: 'Backpack',
          quantity: 5,
        },
      ],
    });

    openCartClientService.getInventory.mockResolvedValue([
      {
        productId: 300,
        name: 'Backpack',
        quantity: 2,
      },
    ]);

    await expect(service.applyOrderDeduction(3)).rejects.toBeInstanceOf(BadRequestException);
    expect(openCartClientService.updateInventory).not.toHaveBeenCalled();
  });
});