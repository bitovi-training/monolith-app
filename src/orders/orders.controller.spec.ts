import { Test, TestingModule } from '@nestjs/testing';
import { CanActivate } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus } from './dto/order-response.dto';
import { AuthGuard, RequireRolesGuard } from '@bitovi-training/auth-middleware';

describe('OrdersController', () => {
  let controller: OrdersController;
  let service: OrdersService;

  const mockOrdersService = {
    listOrders: jest.fn(),
    getOrderById: jest.fn(),
    createOrder: jest.fn(),
    updateOrder: jest.fn(),
    submitOrder: jest.fn(),
    cancelOrder: jest.fn(),
  };

  const mockGuard: CanActivate = {
    canActivate: jest.fn(() => true),
  };

  const mockAuth = 'Bearer test-token';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        {
          provide: OrdersService,
          useValue: mockOrdersService,
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue(mockGuard)
      .overrideGuard(RequireRolesGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<OrdersController>(OrdersController);
    service = module.get<OrdersService>(OrdersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('listOrders', () => {
    it('should call ordersService.listOrders', async () => {
      const mockResult = {
        orders: [
          {
            id: '650e8400-e29b-41d4-a716-446655440000',
            userId: '750e8400-e29b-41d4-a716-446655440000',
            products: [],
            totalPrice: 100,
            orderDate: new Date(),
            status: OrderStatus.PENDING,
          },
        ],
        total: 1,
      };

      mockOrdersService.listOrders.mockResolvedValue(mockResult);

      const result = await controller.listOrders(mockAuth);

      expect(result).toEqual(mockResult);
      expect(mockOrdersService.listOrders).toHaveBeenCalled();
    });
  });

  describe('createOrder', () => {
    it('should call ordersService.createOrder', async () => {
      const createOrderDto: CreateOrderDto = {
        userId: '750e8400-e29b-41d4-a716-446655440000',
        products: [
          { productId: '550e8400-e29b-41d4-a716-446655440000', quantity: 1 },
        ],
      };

      const mockResult = {
        id: '650e8400-e29b-41d4-a716-446655440000',
        userId: createOrderDto.userId,
        products: createOrderDto.products,
        totalPrice: 100,
        orderDate: new Date(),
        status: OrderStatus.PENDING,
      };

      mockOrdersService.createOrder.mockResolvedValue(mockResult);

      const result = await controller.createOrder(createOrderDto, mockAuth);

      expect(result).toEqual(mockResult);
      expect(mockOrdersService.createOrder).toHaveBeenCalledWith(
        createOrderDto,
        'test-token',
      );
    });
  });

  describe('getOrderById', () => {
    it('should call ordersService.getOrderById', async () => {
      const orderId = '650e8400-e29b-41d4-a716-446655440000';
      const mockResult = {
        id: orderId,
        userId: '750e8400-e29b-41d4-a716-446655440000',
        products: [],
        totalPrice: 100,
        orderDate: new Date(),
        status: OrderStatus.PENDING,
      };

      mockOrdersService.getOrderById.mockResolvedValue(mockResult);

      const result = await controller.getOrderById(orderId, mockAuth);

      expect(result).toEqual(mockResult);
      expect(mockOrdersService.getOrderById).toHaveBeenCalledWith(
        orderId,
        'test-token',
      );
    });
  });

  describe('submitOrder', () => {
    it('should call ordersService.submitOrder', async () => {
      const orderId = '650e8400-e29b-41d4-a716-446655440000';
      const mockResult = {
        id: orderId,
        userId: '750e8400-e29b-41d4-a716-446655440000',
        products: [],
        totalPrice: 100,
        orderDate: new Date(),
        status: OrderStatus.PROCESSING,
      };

      mockOrdersService.submitOrder.mockResolvedValue(mockResult);

      const result = await controller.submitOrder(orderId, mockAuth);

      expect(result).toEqual(mockResult);
      expect(mockOrdersService.submitOrder).toHaveBeenCalledWith(
        orderId,
        'test-token',
      );
    });
  });
});
