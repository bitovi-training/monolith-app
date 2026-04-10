import { Injectable } from '@nestjs/common';
import { Order } from '../entities/order.entity';
import { OrderStatus } from '../dto/order-response.dto';

@Injectable()
export class OrderRepository {
  private orders: Map<string, Order> = new Map();

  constructor() {
    // Initialize with mock data
    this.initializeMockData();
  }

  private initializeMockData(): void {
    const mockOrders = [
      {
        id: '650e8400-e29b-41d4-a716-446655440000',
        userId: '750e8400-e29b-41d4-a716-446655440000',
        products: [
          { productId: '550e8400-e29b-41d4-a716-446655440000', quantity: 1 },
          { productId: '550e8400-e29b-41d4-a716-446655440001', quantity: 2 },
        ],
        totalPrice: 1359.97,
        accruedLoyaltyPoints: 0,
        orderDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        status: OrderStatus.PENDING as OrderStatus,
      },
      {
        id: '650e8400-e29b-41d4-a716-446655440001',
        userId: '750e8400-e29b-41d4-a716-446655440000',
        products: [
          { productId: '550e8400-e29b-41d4-a716-446655440002', quantity: 3 },
        ],
        totalPrice: 149.97,
        accruedLoyaltyPoints: 0,
        orderDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        status: OrderStatus.SHIPPED as OrderStatus,
      },
      {
        id: '650e8400-e29b-41d4-a716-446655440002',
        userId: '750e8400-e29b-41d4-a716-446655440001',
        products: [
          { productId: '550e8400-e29b-41d4-a716-446655440003', quantity: 5 },
          { productId: '550e8400-e29b-41d4-a716-446655440004', quantity: 1 },
        ],
        totalPrice: 179.94,
        accruedLoyaltyPoints: 0,
        orderDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        status: OrderStatus.PROCESSING as OrderStatus,
      },
    ];

    for (const mockOrder of mockOrders) {
      const order = this.reconstructOrder(mockOrder);
      this.orders.set(order.id, order);
    }
  }

  private reconstructOrder(data: any): Order {
    const order = new Order(data.userId, data.products, data.totalPrice, data.accruedLoyaltyPoints);
    order.id = data.id;
    order.orderDate = data.orderDate;
    order.status = data.status;
    return order;
  }

  findAll(): Order[] {
    return Array.from(this.orders.values());
  }

  findById(id: string): Order | undefined {
    return this.orders.get(id);
  }

  findByUserId(userId: string): Order[] {
    return Array.from(this.orders.values()).filter(
      (order) => order.userId === userId,
    );
  }

  create(order: Order): Order {
    this.orders.set(order.id, order);
    return order;
  }

  update(order: Order): Order {
    this.orders.set(order.id, order);
    return order;
  }

  delete(id: string): boolean {
    return this.orders.delete(id);
  }

  count(): number {
    return this.orders.size;
  }

  // Reset mock data for testing
  resetMockData(): void {
    this.orders.clear();
    this.initializeMockData();
  }
}
