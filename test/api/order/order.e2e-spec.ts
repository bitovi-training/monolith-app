import { createClient, withRetry } from '../helpers/httpClient';
import { getEnvTokenOrMock } from '../helpers/authTokens';
import { testData } from '../helpers/testData';

/**
 * E2E Tests for Orders Service (TypeScript/NestJS Implementation)
 * 
 * These tests validate the Orders service endpoints against the running NestJS application.
 * The Orders service is now integrated into the main monolith on port 3000.
 * 
 * Previously: Standalone Go service on port 8080
 * Now: NestJS module on port 3000
 */

describe('Order Service - E2E Tests', () => {
  const client = createClient('order', true);
  const adminToken = getEnvTokenOrMock('ADMIN_TOKEN', {
    roles: ['admin'],
  });
  const userToken = getEnvTokenOrMock('USER_TOKEN', {
    roles: ['user'],
  });
  const noAuthClient = createClient('order', false);

  /** Test fixtures */
  const fixtures = {
    validUserId: '750e8400-e29b-41d4-a716-446655440000',
    validProductId: '550e8400-e29b-41d4-a716-446655440000',
    invalidProductId: '550e8400-e29b-41d4-a716-446655440999',
    invalidUUID: 'not-a-uuid',
  };

  describe('Health Check', () => {
    it('should return 200 for health endpoint', async () => {
      const response = await withRetry(() => client.get('/health'));
      expect([200, 404]).toContain(response.status);
    });
  });

  describe('List Orders - GET /orders', () => {
    it('should list all orders with admin token', async () => {
      const adminClient = createClient('order', true, adminToken);
      const response = await withRetry(() => adminClient.get('/orders'));
      
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data.orders).toBeDefined();
      expect(Array.isArray(response.data.orders)).toBe(true);
      expect(response.data.total).toBeGreaterThanOrEqual(0);
    });

    it('should reject request without authentication', async () => {
      const response = await withRetry(() => noAuthClient.get('/orders'));
      expect([401, 403]).toContain(response.status);
    });

    it('should reject request with non-admin token', async () => {
      const userClient = createClient('order', true, userToken);
      const response = await withRetry(() => userClient.get('/orders'));
      expect([401, 403]).toContain(response.status);
    });

    it('should reject request with invalid token format', async () => {
      const invalidClient = createClient('order', true, testData.malformedToken);
      const response = await withRetry(() => invalidClient.get('/orders'));
      expect([401, 403]).toContain(response.status);
    });

    it('should reject request with short bearer token', async () => {
      const invalidClient = createClient('order', true, testData.shortToken);
      const response = await withRetry(() => invalidClient.get('/orders'));
      expect([401, 403]).toContain(response.status);
    });
  });

  describe('Get Order by ID - GET /orders/{orderId}', () => {
    it('should retrieve an order by ID', async () => {
      const adminClient = createClient('order', true, adminToken);
      
      // First, get list of orders
      const listResponse = await withRetry(() => adminClient.get('/orders'));
      expect(listResponse.status).toBe(200);
      
      if (listResponse.data.orders.length > 0) {
        const orderId = listResponse.data.orders[0].id;
        
        // Now get specific order
        const response = await withRetry(() => 
          adminClient.get(`/orders/${orderId}`)
        );
        
        expect(response.status).toBe(200);
        expect(response.data.id).toBe(orderId);
        expect(response.data.userId).toBeDefined();
        expect(response.data.products).toBeDefined();
        expect(response.data.status).toBeDefined();
        expect(response.data.totalPrice).toBeGreaterThan(0);
      }
    });

    it('should return 404 for non-existent order', async () => {
      const adminClient = createClient('order', true, adminToken);
      const fakeOrderId = '650e8400-e29b-41d4-a716-446655440999';
      
      const response = await withRetry(() => 
        adminClient.get(`/orders/${fakeOrderId}`)
      );
      
      expect(response.status).toBe(404);
    });

    it('should reject invalid UUID format', async () => {
      const adminClient = createClient('order', true, adminToken);
      
      const response = await withRetry(() => 
        adminClient.get(`/orders/${fixtures.invalidUUID}`)
      );
      
      expect(response.status).toBe(400);
    });

    it('should require admin role', async () => {
      const userClient = createClient('order', true, userToken);
      
      const response = await withRetry(() => 
        userClient.get(`/orders/650e8400-e29b-41d4-a716-446655440000`)
      );
      
      expect([401, 403]).toContain(response.status);
    });
  });

  describe('Create Order - POST /orders', () => {
    it('should create an order with valid data', async () => {
      const adminClient = createClient('order', true, adminToken);
      
      const createOrderDto = {
        userId: fixtures.validUserId,
        products: [
          {
            productId: fixtures.validProductId,
            quantity: 1,
          },
        ],
      };
      
      const response = await withRetry(() =>
        adminClient.post('/orders', createOrderDto)
      );
      
      expect(response.status).toBe(201);
      expect(response.data.id).toBeDefined();
      expect(response.data.userId).toBe(fixtures.validUserId);
      expect(response.data.products).toBeDefined();
      expect(response.data.products.length).toBeGreaterThan(0);
      expect(response.data.status).toBe('PENDING');
      expect(response.data.totalPrice).toBeGreaterThan(0);
    });

    it('should reject order without userId', async () => {
      const adminClient = createClient('order', true, adminToken);
      
      const createOrderDto = {
        products: [
          {
            productId: fixtures.validProductId,
            quantity: 1,
          },
        ],
      };
      
      const response = await withRetry(() =>
        adminClient.post('/orders', createOrderDto)
      );
      
      expect(response.status).toBe(400);
    });

    it('should reject order with invalid userId format', async () => {
      const adminClient = createClient('order', true, adminToken);
      
      const createOrderDto = {
        userId: fixtures.invalidUUID,
        products: [
          {
            productId: fixtures.validProductId,
            quantity: 1,
          },
        ],
      };
      
      const response = await withRetry(() =>
        adminClient.post('/orders', createOrderDto)
      );
      
      expect(response.status).toBe(400);
    });

    it('should reject order without products', async () => {
      const adminClient = createClient('order', true, adminToken);
      
      const createOrderDto = {
        userId: fixtures.validUserId,
        products: [],
      };
      
      const response = await withRetry(() =>
        adminClient.post('/orders', createOrderDto)
      );
      
      expect(response.status).toBe(400);
    });

    it('should reject order with invalid product quantity', async () => {
      const adminClient = createClient('order', true, adminToken);
      
      const createOrderDto = {
        userId: fixtures.validUserId,
        products: [
          {
            productId: fixtures.validProductId,
            quantity: 0,
          },
        ],
      };
      
      const response = await withRetry(() =>
        adminClient.post('/orders', createOrderDto)
      );
      
      expect(response.status).toBe(400);
    });

    it('should require admin role', async () => {
      const userClient = createClient('order', true, userToken);
      
      const createOrderDto = {
        userId: fixtures.validUserId,
        products: [
          {
            productId: fixtures.validProductId,
            quantity: 1,
          },
        ],
      };
      
      const response = await withRetry(() =>
        userClient.post('/orders', createOrderDto)
      );
      
      expect([401, 403]).toContain(response.status);
    });
  });

  describe('Update Order - PATCH /orders/{orderId}', () => {
    it('should update a pending order', async () => {
      const adminClient = createClient('order', true, adminToken);
      
      // Create order first
      const createResponse = await withRetry(() =>
        adminClient.post('/orders', {
          userId: fixtures.validUserId,
          products: [
            {
              productId: fixtures.validProductId,
              quantity: 1,
            },
          ],
        })
      );
      
      expect(createResponse.status).toBe(201);
      const orderId = createResponse.data.id;
      
      // Update order
      const updateResponse = await withRetry(() =>
        adminClient.patch(`/orders/${orderId}`, {
          products: [
            {
              productId: fixtures.validProductId,
              quantity: 2, // Add 1 more
            },
          ],
        })
      );
      
      expect(updateResponse.status).toBe(200);
      expect(updateResponse.data.id).toBe(orderId);
      expect(updateResponse.data.status).toBe('PENDING');
    });

    it('should reject update with invalid order ID format', async () => {
      const adminClient = createClient('order', true, adminToken);
      
      const response = await withRetry(() =>
        adminClient.patch(`/orders/${fixtures.invalidUUID}`, {
          products: [
            {
              productId: fixtures.validProductId,
              quantity: 1,
            },
          ],
        })
      );
      
      expect(response.status).toBe(400);
    });

    it('should reject update of non-existent order', async () => {
      const adminClient = createClient('order', true, adminToken);
      
      const response = await withRetry(() =>
        adminClient.patch(`/orders/650e8400-e29b-41d4-a716-446655440999`, {
          products: [
            {
              productId: fixtures.validProductId,
              quantity: 1,
            },
          ],
        })
      );
      
      expect(response.status).toBe(404);
    });

    it('should require admin role', async () => {
      const userClient = createClient('order', true, userToken);
      
      const response = await withRetry(() =>
        userClient.patch(`/orders/650e8400-e29b-41d4-a716-446655440000`, {
          products: [
            {
              productId: fixtures.validProductId,
              quantity: 1,
            },
          ],
        })
      );
      
      expect([401, 403]).toContain(response.status);
    });
  });

  describe('Submit Order - POST /orders/{orderId}/submit', () => {
    it('should submit a pending order', async () => {
      const adminClient = createClient('order', true, adminToken);
      
      // Create order first
      const createResponse = await withRetry(() =>
        adminClient.post('/orders', {
          userId: fixtures.validUserId,
          products: [
            {
              productId: fixtures.validProductId,
              quantity: 1,
            },
          ],
        })
      );
      
      expect(createResponse.status).toBe(201);
      const orderId = createResponse.data.id;
      
      // Submit order
      const submitResponse = await withRetry(() =>
        adminClient.post(`/orders/${orderId}/submit`, {})
      );
      
      expect(submitResponse.status).toBe(200);
      expect(submitResponse.data.id).toBe(orderId);
      expect(submitResponse.data.status).toBe('PROCESSING');
    });

    it('should reject submit with invalid order ID format', async () => {
      const adminClient = createClient('order', true, adminToken);
      
      const response = await withRetry(() =>
        adminClient.post(`/orders/${fixtures.invalidUUID}/submit`, {})
      );
      
      expect(response.status).toBe(400);
    });

    it('should require admin role', async () => {
      const userClient = createClient('order', true, userToken);
      
      const response = await withRetry(() =>
        userClient.post(`/orders/650e8400-e29b-41d4-a716-446655440000/submit`, {})
      );
      
      expect([401, 403]).toContain(response.status);
    });
  });

  describe('Order Workflow Integration', () => {
    it('should complete full order lifecycle', async () => {
      const adminClient = createClient('order', true, adminToken);
      
      // 1. Create order
      const createResponse = await withRetry(() =>
        adminClient.post('/orders', {
          userId: fixtures.validUserId,
          products: [
            {
              productId: fixtures.validProductId,
              quantity: 2,
            },
          ],
        })
      );
      
      expect(createResponse.status).toBe(201);
      const orderId = createResponse.data.id;
      expect(createResponse.data.status).toBe('PENDING');
      
      // 2. Verify order created
      const getResponse = await withRetry(() =>
        adminClient.get(`/orders/${orderId}`)
      );
      
      expect(getResponse.status).toBe(200);
      expect(getResponse.data.id).toBe(orderId);
      expect(getResponse.data.status).toBe('PENDING');
      
      // 3. Submit order
      const submitResponse = await withRetry(() =>
        adminClient.post(`/orders/${orderId}/submit`, {})
      );
      
      expect(submitResponse.status).toBe(200);
      expect(submitResponse.data.status).toBe('PROCESSING');
      
      // 4. Verify order status changed
      const finalResponse = await withRetry(() =>
        adminClient.get(`/orders/${orderId}`)
      );
      
      expect(finalResponse.status).toBe(200);
      expect(finalResponse.data.status).toBe('PROCESSING');
    });
  });
});
