import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { ProductsService } from '../products/products.service';

export interface OrderProduct {
  productId: string;
  quantity: number;
}

export type OrderStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELED';

export interface Order {
  id: string;
  userId: string;
  products: OrderProduct[];
  totalPrice: number;
  accruedLoyaltyPoints: number;
  orderDate: string;
  status: OrderStatus;
}

@Injectable()
export class OrdersService {
  private orders: Order[] = [
    {
      id: '650e8400-e29b-41d4-a716-446655440000',
      userId: '550e8400-e29b-41d4-a716-446655440001',
      products: [
        { productId: '550e8400-e29b-41d4-a716-446655440000', quantity: 1 },
      ],
      totalPrice: 1299.99,
      accruedLoyaltyPoints: 0,
      orderDate: new Date().toISOString(),
      status: 'PENDING',
    },
  ];

  constructor(
    private readonly productsService: ProductsService,
    @Inject(forwardRef(() => LoyaltyService))
    private readonly loyaltyService: LoyaltyService,
  ) {}

  listOrders() {
    return { orders: this.orders, total: this.orders.length };
  }

  getOrderById(orderId: string): Order {
    const order = this.orders.find((o) => o.id === orderId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return order;
  }

  createOrder(userId: string, products: OrderProduct[]): Order {
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }
    if (!products?.length) {
      throw new BadRequestException('Order must contain at least one product');
    }

    let totalPrice = 0;
    for (const p of products) {
      if (p.quantity <= 0) {
        throw new BadRequestException('Product quantity must be positive');
      }
      const validated = this.productsService.validateProduct(p.productId);
      totalPrice += validated.price * p.quantity;
    }

    const order: Order = {
      id: randomUUID(),
      userId,
      products,
      totalPrice,
      accruedLoyaltyPoints: 0,
      orderDate: new Date().toISOString(),
      status: 'PENDING',
    };

    this.orders.push(order);
    return order;
  }

  updateOrder(orderId: string, products: OrderProduct[]): Order {
    const order = this.getOrderById(orderId);
    if (order.status !== 'PENDING') {
      throw new BadRequestException('Can only update products for pending orders');
    }

    const current = new Map<string, number>();
    for (const p of order.products) {
      current.set(p.productId, p.quantity);
    }

    for (const change of products) {
      const prev = current.get(change.productId) ?? 0;
      const next = prev + change.quantity;
      if (next <= 0) {
        current.delete(change.productId);
      } else {
        current.set(change.productId, next);
      }
    }

    const updatedProducts: OrderProduct[] = [...current.entries()].map(
      ([productId, quantity]) => ({ productId, quantity }),
    );

    if (!updatedProducts.length) {
      throw new BadRequestException('Order must contain at least one product');
    }

    let totalPrice = 0;
    for (const p of updatedProducts) {
      const validated = this.productsService.validateProduct(p.productId);
      totalPrice += validated.price * p.quantity;
    }

    order.products = updatedProducts;
    order.totalPrice = totalPrice;
    return order;
  }

  cancelOrSubmitOrder(orderId: string, action: 'CANCEL' | 'SUBMIT'): Order {
    const order = this.getOrderById(orderId);
    if (action === 'CANCEL') {
      order.status = 'CANCELED';
      return order;
    }

    if (order.status !== 'PENDING') {
      throw new BadRequestException('Only pending orders can be submitted');
    }

    order.status = 'PROCESSING';
    const accrual = this.loyaltyService.accruePoints(
      order.id,
      order.userId,
      order.totalPrice,
    );
    order.accruedLoyaltyPoints = accrual.points;
    return order;
  }

  getOrdersByUserId(userId: string): Order[] {
    return this.orders.filter((o) => o.userId === userId);
  }
}
