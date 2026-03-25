import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { ProductsService } from '../products/products.service';

describe('OrdersService', () => {
  let service: OrdersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: ProductsService,
          useValue: {
            validateProduct: jest.fn(() => ({ price: 10, name: 'test' })),
          },
        },
        {
          provide: LoyaltyService,
          useValue: {
            accruePoints: jest.fn(() => ({ points: 1 })),
          },
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
