import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '@bitovi-training/auth-middleware';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrderRepository } from './repositories/order.repository';
import { ProductClient } from './clients/product-client';
import { LoyaltyClient } from './clients/loyalty-client';

@Module({
  imports: [HttpModule, ConfigModule, AuthModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrderRepository, ProductClient, LoyaltyClient],
  exports: [OrdersService, OrderRepository],
})
export class OrdersModule {}
