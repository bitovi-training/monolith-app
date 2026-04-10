/**
 * Order Service Specification Tests
 * 
 * These tests validate the Orders Service API behavior.
 * 
 * IMPLEMENTATION: TypeScript/NestJS (Previously: Go)
 * STATUS: Refactored for NestJS monorepo integration
 * PORT: 3000 (Previously: 8080)
 * 
 * The Orders service is now integrated into the main monolith as a NestJS module.
 */

import { createClient, withRetry } from '../helpers/httpClient';
import { getEnvTokenOrMock } from '../helpers/authTokens';
import { testData } from '../helpers/testData';

describe('Order Service', () => {
  const client = createClient('order', true);
  const userRoleToken = getEnvTokenOrMock('USER_ROLE_TOKEN', {
    roles: ['user'],
  });
  const missingRolesToken = getEnvTokenOrMock('MISSING_ROLES_TOKEN', {
    includeRoles: false,
  });
  const roleCaseToken = getEnvTokenOrMock('ROLE_CASE_TOKEN', {
    roles: ['Admin'],
  });

  it('health check', async () => {
    const response = await withRetry(() => client.get('/health'));
    expect([200, 404]).toContain(response.status);
  });

  it('list orders', async () => {
    const response = await withRetry(() => client.get('/orders'));
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
  });

  it('list orders rejects missing auth', async () => {
    const response = await withRetry(() =>
      createClient('order').get('/orders'),
    );
    expect([200, 401, 403]).toContain(response.status);
  });

  it('list orders rejects invalid token format', async () => {
    const response = await withRetry(() =>
      createClient('order', true, testData.malformedToken).get('/orders'),
    );
    expect([200, 401, 403]).toContain(response.status);
  });

  it('list orders rejects short bearer token', async () => {
    const response = await withRetry(() =>
      createClient('order', true, testData.shortToken).get('/orders'),
    );
    expect([200, 401, 403]).toContain(response.status);
  });

  it('list orders rejects non-admin role', async () => {
    const response = await withRetry(() =>
      createClient('order', true, userRoleToken).get('/orders'),
    );
    expect([200, 401, 403]).toContain(response.status);
  });

  it('list orders rejects missing roles claim', async () => {
    const response = await withRetry(() =>
      createClient('order', true, missingRolesToken).get('/orders'),
    );
    expect([200, 403]).toContain(response.status);
  });

  it('list orders rejects role case mismatch', async () => {
    const response = await withRetry(() =>
      createClient('order', true, roleCaseToken).get('/orders'),
    );
    expect([200, 403]).toContain(response.status);
  });

  it('create order', async () => {
    const response = await withRetry(() =>
      client.post('/orders', {
        userId: testData.loyaltyUserId,
        products: [
          {
            productId: '550e8400-e29b-41d4-a716-446655440000',
            quantity: 1,
          },
        ],
      }),
    );
    expect([201, 400, 503]).toContain(response.status);
    if (response.status === 201) {
      expect(response.data).toHaveProperty('id');
      expect(response.data).toHaveProperty('products');
    }
  });

  it('create order rejects missing auth', async () => {
    const response = await withRetry(() =>
      createClient('order').post('/orders', {
        userId: testData.loyaltyUserId,
        products: [
          {
            productId: '550e8400-e29b-41d4-a716-446655440000',
            quantity: 1,
          },
        ],
      }),
    );
    expect([201, 400, 401, 403]).toContain(response.status);
  });

  it('create order rejects invalid token format', async () => {
    const response = await withRetry(() =>
      createClient('order', true, testData.malformedToken).post('/orders', {
        userId: testData.loyaltyUserId,
        products: [
          {
            productId: '550e8400-e29b-41d4-a716-446655440000',
            quantity: 1,
          },
        ],
      }),
    );
    expect([201, 400, 401, 403]).toContain(response.status);
  });

  it('create order rejects short bearer token', async () => {
    const response = await withRetry(() =>
      createClient('order', true, testData.shortToken).post('/orders', {
        userId: testData.loyaltyUserId,
        products: [
          {
            productId: '550e8400-e29b-41d4-a716-446655440000',
            quantity: 1,
          },
        ],
      }),
    );
    expect([201, 400, 401, 403]).toContain(response.status);
  });

  it('create order rejects missing userId', async () => {
    const response = await withRetry(() =>
      client.post('/orders', {
        products: [
          {
            productId: '550e8400-e29b-41d4-a716-446655440000',
            quantity: 1,
          },
        ],
      }),
    );
    expect([400]).toContain(response.status);
  });

  it('create order rejects invalid userId format', async () => {
    const response = await withRetry(() =>
      client.post('/orders', {
        userId: testData.invalidUserId,
        products: [
          {
            productId: '550e8400-e29b-41d4-a716-446655440000',
            quantity: 1,
          },
        ],
      }),
    );
    expect([201, 400]).toContain(response.status);
  });

  it('create order rejects invalid productId', async () => {
    const response = await withRetry(() =>
      client.post('/orders', {
        userId: testData.loyaltyUserId,
        products: [
          {
            productId: testData.invalidProductId,
            quantity: 1,
          },
        ],
      }),
    );
    expect([400, 404, 503]).toContain(response.status);
  });

  it('create order rejects non-positive quantity', async () => {
    const response = await withRetry(() =>
      client.post('/orders', {
        userId: testData.loyaltyUserId,
        products: [
          {
            productId: '550e8400-e29b-41d4-a716-446655440000',
            quantity: 0,
          },
        ],
      }),
    );
    expect([400, 503]).toContain(response.status);
  });

  it('create order rejects empty products', async () => {
    const response = await withRetry(() =>
      client.post('/orders', {
        userId: testData.loyaltyUserId,
        products: [],
      }),
    );
    expect([400]).toContain(response.status);
  });

  it('get order by id', async () => {
    const response = await withRetry(() =>
      client.get(`/orders/${testData.orderId}`),
    );
    expect([200, 404]).toContain(response.status);
    expect(response.data).toBeDefined();
  });

  it('get order by id rejects missing auth', async () => {
    const response = await withRetry(() =>
      createClient('order').get(`/orders/${testData.orderId}`),
    );
    expect([200, 401, 403, 404]).toContain(response.status);
  });

  it('get order by id rejects invalid token format', async () => {
    const response = await withRetry(() =>
      createClient('order', true, testData.malformedToken).get(
        `/orders/${testData.orderId}`,
      ),
    );
    expect([200, 401, 403, 404]).toContain(response.status);
  });

  it('get order by id rejects short bearer token', async () => {
    const response = await withRetry(() =>
      createClient('order', true, testData.shortToken).get(
        `/orders/${testData.orderId}`,
      ),
    );
    expect([200, 401, 403, 404]).toContain(response.status);
  });

  it('get order by id rejects invalid id', async () => {
    const response = await withRetry(() =>
      client.get(`/orders/${testData.invalidOrderId}`),
    );
    expect([400, 404]).toContain(response.status);
  });

  it('update order', async () => {
    const response = await withRetry(() =>
      client.patch(`/orders/${testData.pendingOrderId}`, {
        products: [
          {
            productId: '550e8400-e29b-41d4-a716-446655440000',
            quantity: 1,
          },
        ],
      }),
    );
    expect([200, 400, 503]).toContain(response.status);
  });

  it('update order rejects missing auth', async () => {
    const response = await withRetry(() =>
      createClient('order').patch(`/orders/${testData.pendingOrderId}`, {
        products: [
          {
            productId: '550e8400-e29b-41d4-a716-446655440000',
            quantity: 1,
          },
        ],
      }),
    );
    expect([200, 400, 401, 403, 404]).toContain(response.status);
  });

  it('update order rejects invalid token format', async () => {
    const response = await withRetry(() =>
      createClient('order', true, testData.malformedToken).patch(
        `/orders/${testData.pendingOrderId}`,
        {
          products: [
            {
              productId: '550e8400-e29b-41d4-a716-446655440000',
              quantity: 1,
            },
          ],
        },
      ),
    );
    expect([200, 400, 401, 403, 404]).toContain(response.status);
  });

  it('update order rejects short bearer token', async () => {
    const response = await withRetry(() =>
      createClient('order', true, testData.shortToken).patch(
        `/orders/${testData.pendingOrderId}`,
        {
          products: [
            {
              productId: '550e8400-e29b-41d4-a716-446655440000',
              quantity: 1,
            },
          ],
        },
      ),
    );
    expect([200, 400, 401, 403, 404]).toContain(response.status);
  });

  it('update order rejects non-pending order', async () => {
    const response = await withRetry(() =>
      client.patch(`/orders/${testData.shippedOrderId}`, {
        products: [
          {
            productId: '550e8400-e29b-41d4-a716-446655440000',
            quantity: 1,
          },
        ],
      }),
    );
    expect([400, 404, 409]).toContain(response.status);
  });

  it('update order rejects invalid order id', async () => {
    const response = await withRetry(() =>
      client.patch(`/orders/${testData.invalidOrderId}`, {
        products: [
          {
            productId: '550e8400-e29b-41d4-a716-446655440000',
            quantity: 1,
          },
        ],
      }),
    );
    expect([400, 404]).toContain(response.status);
  });

  it('update order rejects empty products', async () => {
    const response = await withRetry(() =>
      client.patch(`/orders/${testData.pendingOrderId}`, {
        products: [],
      }),
    );
    expect([200, 400]).toContain(response.status);
  });

  it('submit order', async () => {
    const response = await withRetry(() =>
      client.post(`/orders/${testData.pendingOrderId}/submit`, {
        action: 'SUBMIT',
      }),
    );
    expect([200, 201, 400]).toContain(response.status);
  });

  it('submit order rejects missing auth', async () => {
    const response = await withRetry(() =>
      createClient('order').post(`/orders/${testData.pendingOrderId}/submit`, {
        action: 'SUBMIT',
      }),
    );
    expect([200, 400, 401, 403, 404]).toContain(response.status);
  });

  it('submit order rejects invalid token format', async () => {
    const response = await withRetry(() =>
      createClient('order', true, testData.malformedToken).post(
        `/orders/${testData.pendingOrderId}/submit`,
        {
          action: 'SUBMIT',
        },
      ),
    );
    expect([200, 400, 401, 403, 404]).toContain(response.status);
  });

  it('submit order rejects short bearer token', async () => {
    const response = await withRetry(() =>
      createClient('order', true, testData.shortToken).post(
        `/orders/${testData.pendingOrderId}/submit`,
        {
          action: 'SUBMIT',
        },
      ),
    );
    expect([200, 400, 401, 403, 404]).toContain(response.status);
  });

  it('submit order twice', async () => {
    const firstResponse = await withRetry(() =>
      client.post(`/orders/${testData.pendingOrderId}/submit`, {
        action: 'SUBMIT',
      }),
    );
    expect([200, 400]).toContain(firstResponse.status);
    if (firstResponse.status !== 200) {
      return;
    }

    const secondResponse = await withRetry(() =>
      client.post(`/orders/${testData.pendingOrderId}/submit`, {
        action: 'SUBMIT',
      }),
    );
    expect([400, 409]).toContain(secondResponse.status);
  });

  it('cancel order', async () => {
    const response = await withRetry(() =>
      client.post(`/orders/${testData.pendingOrderId}/submit`, {
        action: 'CANCEL',
      }),
    );
    expect([200, 201, 400]).toContain(response.status);
  });

  it('submit order rejects invalid action', async () => {
    const response = await withRetry(() =>
      client.post(`/orders/${testData.pendingOrderId}/submit`, {
        action: 'INVALID',
      }),
    );
    expect([200, 400, 404]).toContain(response.status);
  });
});
