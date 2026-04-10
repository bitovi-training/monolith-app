import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrdersService } from './orders.service';
import { OrderRepository } from './repositories/order.repository';
import { ProductClient } from './clients/product-client';
import { LoyaltyClient } from './clients/loyalty-client';
import { OrderStatus } from './dto/order-response.dto';

describe('OrdersService', () => {
  let service: OrdersService;
  let orderRepository: OrderRepository;
  let productClient: ProductClient;
  let loyaltyClient: LoyaltyClient;
  let configService: ConfigService;

  const mockAuthToken = 'Bearer test-token';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        OrderRepository,
        {
          provide: ProductClient,
          useValue: {
            validateProduct: jest.fn(),
          },
        },
        {
          provide: LoyaltyClient,
          useValue: {
            accruePoints: jest.fn(),
            getBalance: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key) => {
              if (key === 'PRODUCT_SERVICE_URL') return 'http://localhost:3000';
              if (key === 'LOYALTY_SERVICE_URL') return 'http://localhost:3000';
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    orderRepository = module.get<OrderRepository>(OrderRepository);
    productClient = module.get<ProductClient>(ProductClient);
    loyaltyClient = module.get<LoyaltyClient>(LoyaltyClient);
    configService = module.get<ConfigService>(ConfigService);

    // Set default mock implementations that always work
    (productClient.validateProduct as jest.Mock).mockResolvedValue({
      price: 100,
      name: 'Test Product',
    });
    (loyaltyClient.accruePoints as jest.Mock).mockResolvedValue({
      balance: 100,
    });
  });

  afterEach(() => {
    (productClient.validateProduct as jest.Mock).mockClear();
    (loyaltyClient.accruePoints as jest.Mock).mockClear();
    (loyaltyClient.getBalance as jest.Mock).mockClear();
    orderRepository.resetMockData();
  });

  describe('listOrders', () => {
    it('should return all orders', async () => {
      const result = await service.listOrders();

      expect(result.orders).toBeDefined();
      expect(result.total).toBeGreaterThan(0);
      expect(result.orders.length).toBe(result.total);
    });

    it('should return empty list if no orders exist', async () => {
      // Clear repository
      while (orderRepository.findAll().length > 0) {
        const order = orderRepository.findAll()[0];
        orderRepository.delete(order.id);
      }

      const result = await service.listOrders();

      expect(result.orders).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('getOrderById', () => {
    it('should return order by id', async () => {
      const orders = orderRepository.findAll();
      const order = orders[0];

      const result = await service.getOrderById(order.id);

      expect(result.id).toBe(order.id);
      expect(result.userId).toBe(order.userId);
      expect(result.products).toBeDefined();
      expect(result.status).toBe(OrderStatus.PENDING);
    });

    it('should throw NotFoundException if order does not exist', async () => {
      const fakeId = '650e8400-e29b-41d4-a716-446655440999';

      await expect(service.getOrderById(fakeId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException for invalid UUID', async () => {
      await expect(service.getOrderById('invalid-id')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('createOrder', () => {
    it('should create a new order with valid products', async () => {
      const createOrderDto = {
        userId: '750e8400-e29b-41d4-a716-446655440002',
        products: [
          { productId: '550e8400-e29b-41d4-a716-446655440000', quantity: 1 },
        ],
      };

      (productClient.validateProduct as jest.Mock).mockResolvedValueOnce({
        price: 999.99,
        name: 'Test Product',
      });

      const result = await service.createOrder(createOrderDto, mockAuthToken);

      expect(result.id).toBeDefined();
      expect(result.userId).toBe(createOrderDto.userId);
      expect(result.products.length).toBe(1);
      expect(result.status).toBe(OrderStatus.PENDING);
      expect(result.totalPrice).toBe(999.99);
    });

    it('should throw BadRequestException for invalid product', async () => {
      const createOrderDto = {
        userId: '750e8400-e29b-41d4-a716-446655440002',
        products: [
          { productId: '550e8400-e29b-41d4-a716-446655440999', quantity: 1 },
        ],
      };

      (productClient.validateProduct as jest.Mock).mockImplementationOnce(
        async () => {
          throw new Error('Product not found');
        },
      );

      await expect(
        service.createOrder(createOrderDto, mockAuthToken),
      ).rejects.toThrow(BadRequestException);
    });

    it('should calculate total price correctly for multiple products', async () => {
      const createOrderDto = {
        userId: '750e8400-e29b-41d4-a716-446655440002',
        products: [
          { productId: '550e8400-e29b-41d4-a716-446655440000', quantity: 2 },
          { productId: '550e8400-e29b-41d4-a716-446655440001', quantity: 1 },
        ],
      };

      (productClient.validateProduct as jest.Mock).mockImplementation(
        async (productId) => {
          if (productId === '550e8400-e29b-41d4-a716-446655440000') {
            return { price: 100, name: 'Product 1' };
          } else {
            return { price: 50, name: 'Product 2' };
          }
        },
      );

      const result = await service.createOrder(createOrderDto, mockAuthToken);

      expect(result.totalPrice).toBe(250); // (100 * 2) + (50 * 1)
      expect(result.accruedLoyaltyPoints).toBe(250);
    });
  });

  describe('updateOrder', () => {
    it('should update order with new products', async () => {
      const orders = orderRepository.findAll();
      const order = orders.find((o) => o.status === OrderStatus.PENDING);

      if (!order) throw new Error('No pending orders found in mock data');

      const updateOrderDto = {
        products: [
          { productId: '550e8400-e29b-41d4-a716-446655440005', quantity: 1 },
        ],
      };

      (productClient.validateProduct as jest.Mock).mockImplementationOnce(
        async () => ({
          price: 500,
          name: 'New Product',
        }),
      );

      const result = await service.updateOrder(
        order.id,
        updateOrderDto,
        mockAuthToken,
      );

      expect(result.id).toBe(order.id);
      expect(result.products.length).toBeGreaterThanOrEqual(1);
    });

    it('should throw error if order is not pending', async () => {
      const orders = orderRepository.findAll();
      const order = orders.find((o) => o.status !== OrderStatus.PENDING);

      if (!order) {
        // Skip test if no non-pending orders
        return;
      }

      const updateOrderDto = {
        products: [
          { productId: '550e8400-e29b-41d4-a716-446655440005', quantity: 1 },
        ],
      };

      await expect(
        service.updateOrder(order.id, updateOrderDto, mockAuthToken),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('submitOrder', () => {
    it('should submit a pending order', async () => {
      const orders = orderRepository.findAll();
      const order = orders.find((o) => o.status === OrderStatus.PENDING);

      if (!order) throw new Error('No pending orders found in mock data');

      const result = await service.submitOrder(order.id, mockAuthToken);

      expect(result.status).toBe(OrderStatus.PROCESSING);
    });

    it('should throw error if order is not pending', async () => {
      const orders = orderRepository.findAll();
      const order = orders.find((o) => o.status !== OrderStatus.PENDING);

      if (!order) {
        // Skip test if no non-pending orders
        return;
      }

      await expect(
        service.submitOrder(order.id, mockAuthToken),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
