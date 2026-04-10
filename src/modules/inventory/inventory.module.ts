import { Module } from '@nestjs/common';
import { OpenCartModule } from '../../integrations/opencart/opencart.module';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { INVENTORY_SYNC_QUEUE } from '../sync-service/sync-service.constants';
import { SyncService } from '../sync-service/sync-service.service';
import { SyncServiceProcessor } from '../sync-service/sync-service.processor';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';

@Module({
  imports: [
    ConfigModule,
    OpenCartModule,
    BullModule.registerQueue({ name: INVENTORY_SYNC_QUEUE }),
  ],
  providers: [InventoryService, SyncService, SyncServiceProcessor],
  controllers: [InventoryController],
  exports: [InventoryService, SyncService],
})

export class InventoryModule {}