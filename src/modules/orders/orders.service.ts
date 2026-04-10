import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Order } from '../../integrations/opencart/interfaces';
import { OpenCartClientService } from '../../integrations/opencart/opencart.service';
import { SyncService } from '../sync-service/sync-service.service';
import { ListOrdersQueryDto } from './dto/list-orders-query.dto';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrdersService {
  constructor(
    private readonly openCartClientService: OpenCartClientService,
    private readonly inventorySyncService: SyncService,
    private readonly configService: ConfigService,
  ) { }

  createOrder(dto: CreateOrderDto) {
    return this.openCartClientService.createOrder(dto as unknown as Record<string, unknown>);
  }

  findAll(query: ListOrdersQueryDto): Promise<Order[]> {
    const filters: Record<string, string> = {};

    if (query.status) {
      filters.status = query.status;
    }

    if (query.startDate) {
      filters.startDate = query.startDate;
    }

    if (query.endDate) {
      filters.endDate = query.endDate;
    }

    return this.openCartClientService.listOrders(filters);
  }

  findOne(orderId: number): Promise<Order> {
    return this.openCartClientService.getOrder(orderId);
  }

  async updateStatus(orderId: number, status: string, triggerInventorySync = true): Promise<Order> {
    const updatedOrder = await this.openCartClientService.updateOrderStatus(orderId, status);

    if (triggerInventorySync && this.shouldTriggerInventorySync(status)) {
      await this.inventorySyncService.enqueueOrder(orderId, status);
    }

    return updatedOrder;
  }

  private shouldTriggerInventorySync(status: string): boolean {
    const processingStatuses = this.configService.get<string[]>('app.inventory.processingStatuses', [
      'processing',
      'confirmed',
    ]);

    return processingStatuses.includes(status.toLowerCase());
  }
}
