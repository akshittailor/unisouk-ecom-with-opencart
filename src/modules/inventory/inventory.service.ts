import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenCartClientService } from '../../integrations/opencart/opencart.service';
import type { InventoryEntry, Order, OrderProductLine, ProductOptionValue } from '../../integrations/opencart/interfaces';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    private readonly openCartClientService: OpenCartClientService,
    private readonly configService: ConfigService,
  ) {}

  getStockLevels(productId?: number): Promise<InventoryEntry[]> {
    return this.openCartClientService.getInventory(productId);
  }

  adjustStock(productId: number, quantity: number, optionValueId?: number): Promise<InventoryEntry> {
    if (quantity < 0) {
      throw new BadRequestException('Stock quantity cannot be negative');
    }

    return this.openCartClientService.updateInventory(productId, quantity, optionValueId);
  }

  async applyOrderDeduction(orderId: number): Promise<void> {
    const order = await this.openCartClientService.getOrder(orderId);
    await this.deductOrder(order);
  }

  private async deductOrder(order: Order): Promise<void> {
    for (const lineItem of order.products) {
      await this.deductLineItem(lineItem);
    }
  }

  private async deductLineItem(lineItem: OrderProductLine): Promise<void> {
    const inventoryEntries = await this.openCartClientService.getInventory(lineItem.productId);
    const entry = inventoryEntries[0];

    if (!entry) {
      throw new BadRequestException(`Inventory not found for product ${lineItem.productId}`);
    }

    const optionIds = lineItem.selectedOptionValueIds ?? [];

    if (optionIds.length > 0) {
      for (const optionValueId of optionIds) {
        const optionValue = this.findOptionValue(entry, optionValueId);

        if (!optionValue) {
          throw new BadRequestException(
            `Variant option value ${optionValueId} not found for product ${lineItem.productId}`,
          );
        }

        const nextQuantity = this.calculateUpdatedQuantity(optionValue.quantity, lineItem.quantity);
        await this.openCartClientService.updateInventory(lineItem.productId, nextQuantity, optionValueId);
        this.logger.log(
          `Variant stock updated for product ${lineItem.productId} option ${optionValueId}: ${optionValue.quantity} -> ${nextQuantity}`,
        );
      }
      return;
    }

    const nextQuantity = this.calculateUpdatedQuantity(entry.quantity, lineItem.quantity);
    await this.openCartClientService.updateInventory(lineItem.productId, nextQuantity);
    this.logger.log(
      `Stock updated for product ${lineItem.productId}: ${entry.quantity} -> ${nextQuantity}`,
    );
  }

  private calculateUpdatedQuantity(currentQuantity: number, orderedQuantity: number): number {
    const proposedQuantity = currentQuantity - orderedQuantity;

    if (proposedQuantity >= 0) {
      return proposedQuantity;
    }

    const policy = this.configService.get<string>('app.inventory.negativeStockPolicy', 'reject');

    if (policy === 'clamp') {
      return 0;
    }

    throw new BadRequestException(
      `Insufficient stock: current quantity ${currentQuantity}, requested ${orderedQuantity}`,
    );
  }

  private findOptionValue(entry: InventoryEntry, optionValueId: number): ProductOptionValue | undefined {
    for (const option of entry.options ?? []) {
      const matchedValue = option.values.find((value) => value.optionValueId === optionValueId);
      if (matchedValue) {
        return matchedValue;
      }
    }

    return undefined;
  }

  async getLowStockAlerts(thresholdOverride?: number): Promise<
    Array<{ productId: number; productName: string; quantity: number; optionValueId?: number; optionName?: string }>
  > {
    const threshold =
      thresholdOverride ?? this.configService.get<number>('app.inventory.lowStockThreshold', 5);

    const inventory = await this.openCartClientService.getInventory();
    const alerts: Array<{
      productId: number;
      productName: string;
      quantity: number;
      optionValueId?: number;
      optionName?: string;
    }> = [];

    for (const item of inventory) {
      if (item.quantity < threshold) {
        alerts.push({
          productId: item.productId,
          productName: item.name,
          quantity: item.quantity,
        });
      }

      for (const option of item.options ?? []) {
        for (const value of option.values) {
          if (value.quantity < threshold) {
            alerts.push({
              productId: item.productId,
              productName: item.name,
              quantity: value.quantity,
              optionValueId: value.optionValueId,
              optionName: `${option.name}:${value.name}`,
            });
          }
        }
      }
    }

    return alerts;
  }
}
