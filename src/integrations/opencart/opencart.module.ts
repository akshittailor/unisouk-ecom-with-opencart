import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { OpenCartClientService } from './opencart.service';
import { OpenCartController } from './opencart.controller';

@Module({
  imports: [ConfigModule, HttpModule],
  controllers: [OpenCartController],
  providers: [OpenCartClientService],
  exports: [OpenCartClientService],
})
export class OpenCartModule {}
