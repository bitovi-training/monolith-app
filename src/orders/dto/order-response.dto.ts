export class OrderProductResponseDto {
  productId!: string;
  quantity!: number;
}

export class OrderResponseDto {
  id!: string;
  userId!: string;
  products!: OrderProductResponseDto[];
  totalPrice!: number;
  accruedLoyaltyPoints?: number;
  orderDate!: Date;
  status!: OrderStatus;
}

export class OrderListResponseDto {
  orders!: OrderResponseDto[];
  total!: number;
}

export enum OrderStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELED = 'CANCELED',
}
