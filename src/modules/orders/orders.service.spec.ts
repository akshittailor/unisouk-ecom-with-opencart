import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { OrdersService } from './orders.service';
import { OpenCartClientService } from '../../integrations/opencart/opencart.service';
import { SyncService } from '../sync-service/sync-service.service';

describe('OrdersService', () => {
  let service: OrdersService;

  const openCartClientService = {
    listOrders: jest.fn(),
    getOrder: jest.fn(),
    updateOrderStatus: jest.fn(),
  };

  const inventorySyncService = {
    enqueueOrder: jest.fn(),
  };

  const configService = {
    get: jest.fn((key: string, fallback: unknown) => {
      if (key === 'app.inventory.processingStatuses') {
        return ['processing', 'confirmed'];
      }

      return fallback;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: OpenCartClientService, useValue: openCartClientService },
        { provide: SyncService, useValue: inventorySyncService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = moduleRef.get(OrdersService);
  });

  it('passes filters for listOrders', async () => {
    openCartClientService.listOrders.mockResolvedValue([]);

    await service.findAll({
      status: 'processing',
      startDate: '2026-04-1T00:00:00.000Z',
      endDate: '2026-04-31T23:59:59.000Z',
    });

    expect(openCartClientService.listOrders).toHaveBeenCalledWith({
      status: 'processing',
      startDate: '2026-04-1T00:00:00.000Z',
      endDate: '2026-04-31T23:59:59.000Z',
    });
  });

  it('enqueues inventory sync for processing statuses', async () => {
    openCartClientService.updateOrderStatus.mockResolvedValue({ orderId: 11, status: 'processing' });

    await service.updateStatus(11, 'processing');

    expect(inventorySyncService.enqueueOrder).toHaveBeenCalledWith(11, 'processing');
  });

  it('does not enqueue inventory sync for non-processing statuses', async () => {
    openCartClientService.updateOrderStatus.mockResolvedValue({ orderId: 12, status: 'pending' });

    await service.updateStatus(12, 'pending');

    expect(inventorySyncService.enqueueOrder).not.toHaveBeenCalled();
  });
});
