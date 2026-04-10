import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OpenCartModule } from '../../integrations/opencart/opencart.module';
import { InventoryModule } from '../inventory/inventory.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [ConfigModule, OpenCartModule, InventoryModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
