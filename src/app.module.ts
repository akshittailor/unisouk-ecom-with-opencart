import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import appConfig from './config/app.config';
import { ProductsModule } from './modules/products/products.module';
import { OrdersModule } from './modules/orders/orders.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { SyncServiceModule } from './modules/sync-service/sync-service.module';
import { OpenCartModule } from './integrations/opencart/opencart.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('app.redis.host', 'redis'),
          port: configService.get<number>('app.redis.port', 6379),
        },
      }),
    }),
    OpenCartModule,
    ProductsModule,
    OrdersModule,
    InventoryModule,
    SyncServiceModule,
  ],
})
export class AppModule {}