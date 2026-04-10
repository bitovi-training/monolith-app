import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Headers,
  Logger,
  HttpCode,
  UseGuards,
} from '@nestjs/common';
import {
  AuthGuard,
  RequireRolesGuard,
  Roles,
} from '@bitovi-training/auth-middleware';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrderResponseDto, OrderListResponseDto } from './dto/order-response.dto';

@Controller('orders')
export class OrdersController {
  private readonly logger = new Logger(OrdersController.name);

  constructor(private readonly ordersService: OrdersService) {}

  /**
   * GET /orders
   * List all orders (requires admin role)
   */
  @Get()
  @UseGuards(AuthGuard, RequireRolesGuard)
  @Roles('admin')
  async listOrders(
    @Headers('authorization') authorization?: string,
  ): Promise<OrderListResponseDto> {
    this.logger.log('GET /orders - Listing all orders');
    const result = await this.ordersService.listOrders();
    this.logger.log(`GET /orders - Returned ${result.total} orders`);
    return result;
  }

  /**
   * POST /orders
   * Create a new order (requires admin role)
   */
  @Post()
  @HttpCode(201)
  @UseGuards(AuthGuard, RequireRolesGuard)
  @Roles('admin')
  async createOrder(
    @Body() createOrderDto: CreateOrderDto,
    @Headers('authorization') authorization?: string,
  ): Promise<OrderResponseDto> {
    this.logger.log('POST /orders - Creating new order');
    const authToken = this.extractToken(authorization);
    const order = await this.ordersService.createOrder(createOrderDto, authToken);
    this.logger.log(`POST /orders - Created order ${order.id}`);
    return order;
  }

  /**
   * GET /orders/:orderId
   * Get a specific order by ID (requires admin role)
   */
  @Get(':orderId')
  @UseGuards(AuthGuard, RequireRolesGuard)
  @Roles('admin')
  async getOrderById(
    @Param('orderId') orderId: string,
    @Headers('authorization') authorization?: string,
  ): Promise<OrderResponseDto> {
    this.logger.log(`GET /orders/${orderId} - Fetching order details`);
    const authToken = this.extractToken(authorization);
    const order = await this.ordersService.getOrderById(orderId, authToken);
    this.logger.log(`GET /orders/${orderId} - Order found`);
    return order;
  }

  /**
   * PATCH /orders/:orderId
   * Update order products (requires admin role, order must be PENDING)
   */
  @Patch(':orderId')
  @UseGuards(AuthGuard, RequireRolesGuard)
  @Roles('admin')
  async updateOrder(
    @Param('orderId') orderId: string,
    @Body() updateOrderDto: UpdateOrderDto,
    @Headers('authorization') authorization?: string,
  ): Promise<OrderResponseDto> {
    this.logger.log(`PATCH /orders/${orderId} - Updating order`);
    const authToken = this.extractToken(authorization);
    const order = await this.ordersService.updateOrder(
      orderId,
      updateOrderDto,
      authToken,
    );
    this.logger.log(`PATCH /orders/${orderId} - Order updated`);
    return order;
  }

  /**
   * POST /orders/:orderId/submit
   * Submit or cancel order (requires admin role, order must be PENDING)
   */
  @Post(':orderId/submit')
  @UseGuards(AuthGuard, RequireRolesGuard)
  @Roles('admin')
  async submitOrder(
    @Param('orderId') orderId: string,
    @Headers('authorization') authorization?: string,
  ): Promise<OrderResponseDto> {
    this.logger.log(`POST /orders/${orderId}/submit - Submitting order`);
    const authToken = this.extractToken(authorization);
    const order = await this.ordersService.submitOrder(orderId, authToken);
    this.logger.log(`POST /orders/${orderId}/submit - Order submitted`);
    return order;
  }

  // GET /health endpoint handled by app.controller.ts
  // but we should add it here for consistency
  @Get('/health')
  health(): { status: string } {
    return { status: 'ok' };
  }

  private extractToken(authorization?: string): string | undefined {
    if (!authorization) {
      return undefined;
    }
    return authorization.replace('Bearer ', '');
  }
}
