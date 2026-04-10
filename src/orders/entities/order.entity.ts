import { v4 as uuidv4 } from 'uuid';
import { OrderStatus } from '../dto/order-response.dto';

export interface OrderProduct {
  productId: string;
  quantity: number;
}

export class Order {
  id: string;
  userId: string;
  products: OrderProduct[];
  totalPrice: number;
  accruedLoyaltyPoints?: number;
  orderDate: Date;
  status: OrderStatus;

  constructor(
    userId: string,
    products: OrderProduct[],
    totalPrice: number,
    accruedLoyaltyPoints?: number,
  ) {
    this.id = uuidv4();
    this.userId = userId;
    this.products = products;
    this.totalPrice = totalPrice;
    this.accruedLoyaltyPoints = accruedLoyaltyPoints || 0;
    this.orderDate = new Date();
    this.status = OrderStatus.PENDING;
  }

  updateProducts(updates: Array<{ productId: string; quantity: number }>): void {
    for (const update of updates) {
      if (update.quantity === 0) {
        continue; // No change for quantity 0
      }

      const existingIdx = this.products.findIndex(
        (p) => p.productId === update.productId,
      );

      if (existingIdx >= 0) {
        // Product exists, update quantity (additive/subtractive)
        this.products[existingIdx].quantity += update.quantity;

        // Remove product if quantity becomes <= 0
        if (this.products[existingIdx].quantity <= 0) {
          this.products.splice(existingIdx, 1);
        }
      } else if (update.quantity > 0) {
        // New product, add it
        this.products.push({
          productId: update.productId,
          quantity: update.quantity,
        });
      }
    }
  }

  submit(): void {
    if (this.status !== OrderStatus.PENDING) {
      throw new Error('Order is not in PENDING status');
    }
    this.status = OrderStatus.PROCESSING;
  }

  cancel(): void {
    if (this.status !== OrderStatus.PENDING) {
      throw new Error('Order is not in PENDING status');
    }
    this.status = OrderStatus.CANCELED;
  }
}
