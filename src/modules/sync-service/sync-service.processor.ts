import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { InventoryService } from '../inventory/inventory.service';
import { INVENTORY_SYNC_JOB, INVENTORY_SYNC_QUEUE } from './sync-service.constants';

interface SyncServiceJobPayload {
  orderId: number;
  status: string;
  triggeredAt: string;
}

@Processor(INVENTORY_SYNC_QUEUE)
export class SyncServiceProcessor extends WorkerHost {
  private readonly logger = new Logger(SyncServiceProcessor.name);

  constructor(private readonly inventoryService: InventoryService) {
    super();
  }

  async process(job: Job<SyncServiceJobPayload>): Promise<void> {
    if (job.name !== INVENTORY_SYNC_JOB) {
      return;
    }

    this.logger.log(`Processing inventory sync  for order ${job.data.orderId}`);
    await this.inventoryService.applyOrderDeduction(job.data.orderId);
  }
}
