import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { OrdersService } from '../orders/orders.service';
import { UsersService } from '../users/users.service';

export interface Redemption {
  redemptionId: string;
  userId: string;
  points: number;
  timestamp: string;
}

@Injectable()
export class LoyaltyService {
  private redemptions: Redemption[] = [];
  private accruedPointsByOrder = new Map<string, number>();

  constructor(
    @Inject(forwardRef(() => OrdersService))
    private readonly ordersService: OrdersService,
    private readonly usersService: UsersService,
  ) {}

  getBalance(userId: string) {
    this.assertUserExists(userId);

    const userOrders = this.ordersService.getOrdersByUserId(userId);
    const earnedPoints = userOrders
      .filter((o) => o.status === 'SHIPPED' || o.status === 'DELIVERED')
      .reduce((sum, o) => sum + (o.accruedLoyaltyPoints || 0), 0);

    const redeemedPoints = this.redemptions
      .filter((r) => r.userId === userId)
      .reduce((sum, r) => sum + r.points, 0);

    return {
      userId,
      balance: earnedPoints - redeemedPoints,
      earnedPoints,
      redeemedPoints,
    };
  }

  redeemPoints(userId: string, points: number) {
    this.assertUserExists(userId);

    if (points <= 0) {
      throw new BadRequestException('Redemption amount must be positive');
    }

    const { balance } = this.getBalance(userId);
    if (balance < points) {
      throw new ConflictException(
        `Insufficient points. Available: ${balance}, Requested: ${points}`,
      );
    }

    const redemption: Redemption = {
      redemptionId: randomUUID(),
      userId,
      points,
      timestamp: new Date().toISOString(),
    };

    this.redemptions.push(redemption);

    return {
      ...redemption,
      newBalance: balance - points,
    };
  }

  getRedemptionHistory(userId: string) {
    this.assertUserExists(userId);

    return {
      userId,
      redemptions: this.redemptions
        .filter((r) => r.userId === userId)
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
    };
  }

  accruePoints(orderId: string, userId: string, totalPrice: number) {
    this.assertUserExists(userId);
    this.ordersService.getOrderById(orderId);

    if (totalPrice < 0) {
      throw new BadRequestException('Total price must be non-negative');
    }

    const points = Math.floor(totalPrice / 10);
    this.accruedPointsByOrder.set(orderId, points);

    return { orderId, userId, points };
  }

  private assertUserExists(userId: string) {
    if (!this.usersService.userExists(userId)) {
      throw new NotFoundException(`User ${userId} not found`);
    }
  }
}
