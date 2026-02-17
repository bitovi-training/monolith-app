import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { LoyaltyService } from './loyalty.service';

@Controller('loyalty')
export class LoyaltyController {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  @Get(':userId/balance')
  getBalance(@Param('userId') userId: string) {
    return this.loyaltyService.getBalance(userId);
  }

  @Post(':userId/redeem')
  redeemPoints(
    @Param('userId') userId: string,
    @Body() body: { points: number },
  ) {
    return this.loyaltyService.redeemPoints(userId, body.points);
  }

  @Get(':userId/redemptions')
  getRedemptionHistory(@Param('userId') userId: string) {
    return this.loyaltyService.getRedemptionHistory(userId);
  }

  @Post('orders')
  accrueOrderPoints(
    @Body() body: { orderId: string; userId: string; totalPrice: number },
  ) {
    return this.loyaltyService.accruePoints(
      body.orderId,
      body.userId,
      body.totalPrice,
    );
  }
}
