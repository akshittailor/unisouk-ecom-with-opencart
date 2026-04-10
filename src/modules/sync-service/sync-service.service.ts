import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { INVENTORY_SYNC_JOB, INVENTORY_SYNC_QUEUE } from './sync-service.constants';

@Injectable()
export class SyncService {
  constructor(@InjectQueue(INVENTORY_SYNC_QUEUE) private readonly inventoryQueue: Queue) {}

  async enqueueOrder(orderId: number, status: string): Promise<void> {
    await this.inventoryQueue.add(
      INVENTORY_SYNC_JOB,
      { orderId, status, triggeredAt: new Date().toISOString() },
      {
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: 100,
        removeOnFail: 100,
      },
    );
  }
}
