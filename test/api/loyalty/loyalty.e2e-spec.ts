import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../src/app.module';
import { createMockJwt } from '../helpers/authTokens';
import { OrderClient } from '../../../src/loyalty/clients/order-client';
import { UserClient } from '../../../src/loyalty/clients/user-client';
import { RedemptionRepository } from '../../../src/loyalty/repositories/redemption.repository';
import { Redemption } from '../../../src/loyalty/entities/redemption.entity';

describe('Loyalty API - User Story 1: Balance Endpoint (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    // Create mock implementations
    const mockOrderClient = {
      getOrdersByUserId: (userId: string, authToken?: string) => {
        // Return test data based on userId
        const orderData = {
          alice: [
            {
              id: 'order1',
              userId: 'alice',
              status: 'DELIVERED',
              accruedLoyaltyPoints: 100,
            },
            {
              id: 'order2',
              userId: 'alice',
              status: 'DELIVERED',
              accruedLoyaltyPoints: 100,
            },
            {
              id: 'order3',
              userId: 'alice',
              status: 'DELIVERED',
              accruedLoyaltyPoints: 100,
            },
          ],
          bob: [],
          charlie: [
            {
              id: 'order1',
              userId: 'charlie',
              status: 'DELIVERED',
              accruedLoyaltyPoints: 250,
            },
            {
              id: 'order2',
              userId: 'charlie',
              status: 'DELIVERED',
              accruedLoyaltyPoints: 250,
            },
          ],
          eve: [
            {
              id: 'order1',
              userId: 'eve',
              status: 'DELIVERED',
              accruedLoyaltyPoints: 100,
            },
          ],
        };
        return Promise.resolve(orderData[userId] || []);
      },
    };

    const mockUserClient = {
      validateUser: (userId: string) => {
        // These users exist, all others don't
        const existingUsers = ['alice', 'bob', 'charlie', 'eve'];
        return Promise.resolve(existingUsers.includes(userId));
      },
    };

    // Create mock redemption repository with test data
    const mockRedemptionRepository = {
      findByUserId: (userId: string) => {
        const redemptionData = {
          alice: [
            {
              redemptionId: 'redeemed-alice-1',
              userId: 'alice',
              points: 100,
              timestamp: new Date('2024-01-01'),
            },
          ],
          charlie: [
            {
              redemptionId: 'redeemed-charlie-1',
              userId: 'charlie',
              points: 250,
              timestamp: new Date('2024-01-01'),
            },
            {
              redemptionId: 'redeemed-charlie-2',
              userId: 'charlie',
              points: 250,
              timestamp: new Date('2024-01-02'),
            },
          ],
          eve: [
            {
              redemptionId: 'redeemed-eve-1',
              userId: 'eve',
              points: 30,
              timestamp: new Date('2024-01-01'),
            },
            {
              redemptionId: 'redeemed-eve-2',
              userId: 'eve',
              points: 20,
              timestamp: new Date('2024-01-02'),
            },
          ],
        };
        return (redemptionData[userId] || []) as Redemption[];
      },
      save: (redemption: Redemption) => {
        // No-op for test
      },
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(OrderClient)
      .useValue(mockOrderClient)
      .overrideProvider(UserClient)
      .useValue(mockUserClient)
      .overrideProvider(RedemptionRepository)
      .useValue(mockRedemptionRepository)
      .compile();

    app = moduleFixture.createNestApplication();

    // Apply same validation as main.ts
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /loyalty/:userId/balance', () => {
    // T025: Success case - alice returns 200 balance
    it('should return balance for user with activity (alice)', () => {
      const token = createMockJwt({ roles: ['admin'] });
      return request(app.getHttpServer())
        .get('/loyalty/alice/balance')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect({
          userId: 'alice',
          balance: 200,
          earnedPoints: 300,
          redeemedPoints: 100,
        });
    });

    it('should return zero balance for user with no orders (bob)', () => {
      const token = createMockJwt({ roles: ['admin'] });
      return request(app.getHttpServer())
        .get('/loyalty/bob/balance')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect({
          userId: 'bob',
          balance: 0,
          earnedPoints: 0,
          redeemedPoints: 0,
        });
    });

    it('should return zero balance for fully redeemed user (charlie)', () => {
      const token = createMockJwt({ roles: ['admin'] });
      return request(app.getHttpServer())
        .get('/loyalty/charlie/balance')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect({
          userId: 'charlie',
          balance: 0,
          earnedPoints: 500,
          redeemedPoints: 500,
        });
    });

    // T026: User not found case - 404 error
    it('should return 404 for non-existent user', () => {
      const token = createMockJwt({ roles: ['admin'] });
      return request(app.getHttpServer())
        .get('/loyalty/nonexistent/balance')
        .set('Authorization', `Bearer ${token}`)
        .expect(404)
        .expect((res) => {
          expect(res.body.statusCode).toBe(404);
          expect(res.body.message).toContain('User nonexistent not found');
          expect(res.body.error).toBe('Not Found');
        });
    });

    // T027: Performance test - <2s response time per plan.md
    it('should respond within 2 seconds', async () => {
      const token = createMockJwt({ roles: ['admin'] });
      const startTime = Date.now();

      await request(app.getHttpServer())
        .get('/loyalty/alice/balance')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(2000); // <2s per plan.md
    });
  });

  describe('POST /loyalty/:userId/redeem', () => {
    // T043: Success case - valid redemption
    it('should successfully redeem points with valid request', () => {
      const token = createMockJwt({ roles: ['admin'] });
      return request(app.getHttpServer())
        .post('/loyalty/alice/redeem')
        .set('Authorization', `Bearer ${token}`)
        .send({ points: 50 })
        .expect(201)
        .expect((res) => {
          expect(res.body.userId).toBe('alice');
          expect(res.body.points).toBe(50);
          expect(res.body.redemptionId).toBeDefined();
          expect(res.body.timestamp).toBeDefined();
          expect(res.body.newBalance).toBe(150); // 200 - 50
        });
    });

    // T044: Insufficient points case - 409 Conflict
    it('should return 409 when insufficient points', () => {
      const token = createMockJwt({ roles: ['admin'] });
      return request(app.getHttpServer())
        .post('/loyalty/bob/redeem')
        .set('Authorization', `Bearer ${token}`)
        .send({ points: 100 })
        .expect(409)
        .expect((res) => {
          expect(res.body.statusCode).toBe(409);
          expect(res.body.message).toContain('Insufficient points');
          expect(res.body.error).toBe('Conflict');
        });
    });

    // T045: Validation error - negative points
    it('should return 400 for negative points', () => {
      const token = createMockJwt({ roles: ['admin'] });
      return request(app.getHttpServer())
        .post('/loyalty/alice/redeem')
        .set('Authorization', `Bearer ${token}`)
        .send({ points: -50 })
        .expect(400)
        .expect((res) => {
          expect(res.body.statusCode).toBe(400);
          expect(res.body.error).toBe('Bad Request');
        });
    });

    it('should return 400 for zero points', () => {
      const token = createMockJwt({ roles: ['admin'] });
      return request(app.getHttpServer())
        .post('/loyalty/alice/redeem')
        .set('Authorization', `Bearer ${token}`)
        .send({ points: 0 })
        .expect(400);
    });

    // T046: User not found - 404
    it('should return 404 for non-existent user', () => {
      const token = createMockJwt({ roles: ['admin'] });
      return request(app.getHttpServer())
        .post('/loyalty/nonexistent/redeem')
        .set('Authorization', `Bearer ${token}`)
        .send({ points: 50 })
        .expect(404)
        .expect((res) => {
          expect(res.body.statusCode).toBe(404);
          expect(res.body.error).toBe('Not Found');
        });
    });

    // T047: Performance test - <3s response time
    it('should respond within 3 seconds', async () => {
      const token = createMockJwt({ roles: ['admin'] });
      const startTime = Date.now();

      await request(app.getHttpServer())
        .post('/loyalty/eve/redeem')
        .set('Authorization', `Bearer ${token}`)
        .send({ points: 25 })
        .expect(201);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(3000); // <3s per plan.md
    });
  });

  describe('GET /loyalty/:userId/redemptions', () => {
    // T064: Success case with multiple redemptions
    it('should return redemption history in reverse chronological order', () => {
      const token = createMockJwt({ roles: ['admin'] });
      return request(app.getHttpServer())
        .get('/loyalty/eve/redemptions')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.userId).toBe('eve');
          expect(res.body.redemptions.length).toBeGreaterThanOrEqual(2); // At least stub data
          // Verify sorted by timestamp descending (newest first)
          for (let i = 0; i < res.body.redemptions.length - 1; i++) {
            const current = new Date(
              res.body.redemptions[i].timestamp,
            ).getTime();
            const next = new Date(
              res.body.redemptions[i + 1].timestamp,
            ).getTime();
            expect(current).toBeGreaterThanOrEqual(next);
          }
        });
    });

    // T065: Empty history case
    it('should return empty array for user with no redemptions', () => {
      const token = createMockJwt({ roles: ['admin'] });
      return request(app.getHttpServer())
        .get('/loyalty/bob/redemptions')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.userId).toBe('bob');
          expect(res.body.redemptions).toEqual([]);
        });
    });

    // T066: User not found
    it('should return 404 for non-existent user', () => {
      const token = createMockJwt({ roles: ['admin'] });
      return request(app.getHttpServer())
        .get('/loyalty/nonexistent/redemptions')
        .set('Authorization', `Bearer ${token}`)
        .expect(404)
        .expect((res) => {
          expect(res.body.statusCode).toBe(404);
          expect(res.body.error).toBe('Not Found');
        });
    });
  });
});
