import {
  Injectable,
  NotFoundException,
  BadRequestException,
  HttpException,
  HttpStatus,
  Logger,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Order } from './entities/order.entity';
import { OrderRepository } from './repositories/order.repository';
import { ProductClient } from './clients/product-client';
import { LoyaltyClient } from './clients/loyalty-client';
import { OrderResponseDto, OrderStatus } from './dto/order-response.dto';
import { CreateOrderDto, OrderProductDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);
  private readonly productServiceUrl: string;
  private readonly loyaltyServiceUrl: string;

  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly productClient: ProductClient,
    private readonly loyaltyClient: LoyaltyClient,
    private readonly configService: ConfigService,
  ) {
    this.productServiceUrl =
      this.configService.get<string>('PRODUCT_SERVICE_URL') ||
      'http://localhost:3000';
    this.loyaltyServiceUrl =
      this.configService.get<string>('LOYALTY_SERVICE_URL') ||
      'http://localhost:3000';
  }

  async listOrders(): Promise<{ orders: OrderResponseDto[]; total: number }> {
    const orders = this.orderRepository.findAll();
    return {
      orders: orders.map((order) => this.mapOrderToResponse(order)),
      total: orders.length,
    };
  }

  async getOrderById(
    orderId: string,
    authToken?: string,
  ): Promise<OrderResponseDto> {
    this.validateUUID(orderId, 'Order ID');

    const order = this.orderRepository.findById(orderId);
    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    return this.mapOrderToResponse(order);
  }

  async createOrder(
    createOrderDto: CreateOrderDto,
    authToken?: string,
  ): Promise<OrderResponseDto> {
    const { userId, products } = createOrderDto;

    // Validate products exist and calculate total price
    const validatedProducts: Array<{
      productId: string;
      price: number;
      quantity: number;
    }> = [];
    let totalPrice = 0;
    const invalidProducts: string[] = [];

    for (const product of products) {
      try {
        const { price } = await this.productClient.validateProduct(
          product.productId,
          this.productServiceUrl,
          authToken,
        );
        validatedProducts.push({
          productId: product.productId,
          price,
          quantity: product.quantity,
        });
        totalPrice += price * product.quantity;
      } catch (error) {
        invalidProducts.push(product.productId);
      }
    }

    if (invalidProducts.length > 0) {
      throw new BadRequestException(
        `Invalid products: ${invalidProducts.join(', ')}`,
      );
    }

    // Create new order
    const order = new Order(
      userId,
      products.map((p) => ({ productId: p.productId, quantity: p.quantity })),
      totalPrice,
    );

    // Calculate loyalty points (1 point per dollar)
    order.accruedLoyaltyPoints = Math.floor(totalPrice);

    // Save order
    const savedOrder = this.orderRepository.create(order);

    // Attempt to accrue loyalty points (non-blocking)
    if (order.accruedLoyaltyPoints > 0) {
      this.loyaltyClient
        .accruePoints(
          userId,
          order.accruedLoyaltyPoints,
          this.loyaltyServiceUrl,
          authToken,
        )
        .catch((error) => {
          this.logger.warn(
            `Failed to accrue loyalty points: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        });
    }

    return this.mapOrderToResponse(savedOrder);
  }

  async updateOrder(
    orderId: string,
    updateOrderDto: UpdateOrderDto,
    authToken?: string,
  ): Promise<OrderResponseDto> {
    this.validateUUID(orderId, 'Order ID');

    const order = this.orderRepository.findById(orderId);
    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    // Order must be in PENDING status to update
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('ORDER_NOT_PENDING', {
        cause: `Order ${orderId} is not in PENDING status`,
      });
    }

    if (!updateOrderDto.products || updateOrderDto.products.length === 0) {
      throw new BadRequestException('At least one product update is required');
    }

    // Validate any new products
    const invalidProducts: string[] = [];
    const productPrices: Map<string, number> = new Map();

    for (const product of updateOrderDto.products) {
      // Only validate new products (not already in order)
      const isExisting = order.products.some(
        (p) => p.productId === product.productId,
      );

      if (!isExisting && product.quantity > 0) {
        try {
          const { price } = await this.productClient.validateProduct(
            product.productId,
            this.productServiceUrl,
            authToken,
          );
          productPrices.set(product.productId, price);
        } catch (error) {
          invalidProducts.push(product.productId);
        }
      }
    }

    if (invalidProducts.length > 0) {
      throw new BadRequestException(
        `Invalid products: ${invalidProducts.join(', ')}`,
      );
    }

    // Store old total price for loyalty points adjustment
    const oldTotalPrice = order.totalPrice;

    // Update products
    order.updateProducts(updateOrderDto.products);

    // Recalculate total price
    let newTotalPrice = 0;
    for (const product of order.products) {
      const price =
        productPrices.get(product.productId) ||
        (
          await this.productClient.validateProduct(
            product.productId,
            this.productServiceUrl,
            authToken,
          )
        ).price;
      newTotalPrice += price * product.quantity;
    }

    order.totalPrice = newTotalPrice;
    order.accruedLoyaltyPoints = Math.floor(newTotalPrice);

    // Save updated order
    const updatedOrder = this.orderRepository.update(order);

    return this.mapOrderToResponse(updatedOrder);
  }

  async submitOrder(
    orderId: string,
    authToken?: string,
  ): Promise<OrderResponseDto> {
    this.validateUUID(orderId, 'Order ID');

    const order = this.orderRepository.findById(orderId);
    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('ORDER_NOT_PENDING', {
        cause: `Order ${orderId} is not in PENDING status`,
      });
    }

    order.submit();
    const updatedOrder = this.orderRepository.update(order);

    return this.mapOrderToResponse(updatedOrder);
  }

  async cancelOrder(
    orderId: string,
    authToken?: string,
  ): Promise<OrderResponseDto> {
    this.validateUUID(orderId, 'Order ID');

    const order = this.orderRepository.findById(orderId);
    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('ORDER_NOT_PENDING', {
        cause: `Order ${orderId} is not in PENDING status`,
      });
    }

    order.cancel();
    const updatedOrder = this.orderRepository.update(order);

    return this.mapOrderToResponse(updatedOrder);
  }

  private mapOrderToResponse(order: Order): OrderResponseDto {
    return {
      id: order.id,
      userId: order.userId,
      products: order.products.map((p) => ({
        productId: p.productId,
        quantity: p.quantity,
      })),
      totalPrice: order.totalPrice,
      accruedLoyaltyPoints: order.accruedLoyaltyPoints,
      orderDate: order.orderDate,
      status: order.status,
    };
  }

  private validateUUID(value: string, fieldName: string): void {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(value)) {
      throw new BadRequestException(`Invalid ${fieldName} format`);
    }
  }
}
