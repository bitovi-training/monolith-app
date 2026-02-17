import { Test, TestingModule } from '@nestjs/testing';
import { LoyaltyService } from './loyalty.service';
import { OrdersService } from '../orders/orders.service';
import { UsersService } from '../users/users.service';

describe('LoyaltyService', () => {
  let service: LoyaltyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoyaltyService,
        {
          provide: OrdersService,
          useValue: {
            getOrdersByUserId: jest.fn(() => []),
            getOrderById: jest.fn(() => ({ id: 'order-1' })),
          },
        },
        {
          provide: UsersService,
          useValue: {
            userExists: jest.fn(() => true),
          },
        },
      ],
    }).compile();

    service = module.get<LoyaltyService>(LoyaltyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
