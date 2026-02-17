import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { OrderProduct, OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  listOrders() {
    return this.ordersService.listOrders();
  }

  @Post()
  createOrder(@Body() body: { userId: string; products: OrderProduct[] }) {
    return this.ordersService.createOrder(body.userId, body.products);
  }

  @Get(':orderId')
  getOrderById(@Param('orderId') orderId: string) {
    return this.ordersService.getOrderById(orderId);
  }

  @Patch(':orderId')
  updateOrder(
    @Param('orderId') orderId: string,
    @Body() body: { products: OrderProduct[] },
  ) {
    return this.ordersService.updateOrder(orderId, body.products);
  }

  @Post(':orderId/submit')
  cancelOrSubmit(
    @Param('orderId') orderId: string,
    @Body() body: { action: 'CANCEL' | 'SUBMIT' },
  ) {
    return this.ordersService.cancelOrSubmitOrder(orderId, body.action);
  }
}
