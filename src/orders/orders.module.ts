import { Module, forwardRef } from '@nestjs/common';
import { LoyaltyModule } from '../loyalty/loyalty.module';
import { ProductsModule } from '../products/products.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [ProductsModule, forwardRef(() => LoyaltyModule)],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
