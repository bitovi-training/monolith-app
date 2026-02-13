import { Module, forwardRef } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module';
import { UsersModule } from '../users/users.module';
import { LoyaltyController } from './loyalty.controller';
import { LoyaltyService } from './loyalty.service';

@Module({
  imports: [UsersModule, forwardRef(() => OrdersModule)],
  controllers: [LoyaltyController],
  providers: [LoyaltyService],
  exports: [LoyaltyService],
})
export class LoyaltyModule {}
