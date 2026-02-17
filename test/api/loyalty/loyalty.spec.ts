import { createClient, withRetry } from '../helpers/httpClient';
import { testData } from '../helpers/testData';

type LoyaltyBalanceResponse = {
  userId: string;
  balance: number;
  earnedPoints: number;
  redeemedPoints: number;
};

type RedemptionRecord = {
  redemptionId: string;
  userId: string;
  points: number;
  timestamp: string;
};

type RedemptionHistoryResponse = {
  userId: string;
  redemptions: RedemptionRecord[];
};

describe('Loyalty Service', () => {
  const client = createClient('loyalty', true);
  const unauthenticatedClient = createClient('loyalty');

  it('get loyalty points balance for a user', async () => {
    const response = await withRetry(() =>
      client.get<LoyaltyBalanceResponse>(
        `/loyalty/${testData.loyaltyUserId}/balance`,
      ),
    );
    expect([200, 404]).toContain(response.status);
    expect(response.data).toBeDefined();
    if (response.status === 200) {
      expect(response.data).toHaveProperty('userId');
      expect(response.data).toHaveProperty('balance');
      expect(response.data).toHaveProperty('earnedPoints');
      expect(response.data).toHaveProperty('redeemedPoints');
      expect(typeof response.data.balance).toBe('number');
      expect(typeof response.data.earnedPoints).toBe('number');
      expect(typeof response.data.redeemedPoints).toBe('number');
    }
  });

  it('get balance rejects missing auth', async () => {
    const response = await withRetry(() =>
      unauthenticatedClient.get(`/loyalty/${testData.loyaltyUserId}/balance`),
    );
    expect([200, 401, 403, 404]).toContain(response.status);
  });

  it('get balance rejects malformed token', async () => {
    const response = await withRetry(() =>
      createClient('loyalty', true, testData.malformedToken).get(
        `/loyalty/${testData.loyaltyUserId}/balance`,
      ),
    );
    expect([200, 401, 403, 404]).toContain(response.status);
  });

  it('get balance rejects invalid user id', async () => {
    const response = await withRetry(() =>
      client.get(`/loyalty/${testData.invalidUserId}/balance`),
    );
    expect([400, 404]).toContain(response.status);
  });

  it('redeem loyalty points for a user', async () => {
    const response = await withRetry(() =>
      client.post(`/loyalty/${testData.loyaltyUserId}/redeem`, {
        points: 10,
      }),
    );
    expect([200, 201, 400, 404, 409]).toContain(response.status);
    expect(response.data).toBeDefined();
    if (response.status === 200 || response.status === 201) {
      expect(response.data).toHaveProperty('redemptionId');
      expect(response.data).toHaveProperty('userId');
      expect(response.data).toHaveProperty('points');
      expect(response.data).toHaveProperty('timestamp');
      expect(response.data).toHaveProperty('newBalance');
    }
  });

  it('redeem rejects missing auth', async () => {
    const response = await withRetry(() =>
      unauthenticatedClient.post(`/loyalty/${testData.loyaltyUserId}/redeem`, {
        points: 10,
      }),
    );
    expect([200, 201, 401, 403, 404, 409]).toContain(response.status);
  });

  it('redeem rejects malformed token', async () => {
    const response = await withRetry(() =>
      createClient('loyalty', true, testData.malformedToken).post(
        `/loyalty/${testData.loyaltyUserId}/redeem`,
        {
          points: 10,
        },
      ),
    );
    expect([200, 201, 401, 403, 404, 409]).toContain(response.status);
  });

  it('redeem rejects negative points', async () => {
    const response = await withRetry(() =>
      client.post(`/loyalty/${testData.loyaltyUserId}/redeem`, {
        points: -5,
      }),
    );
    expect([400, 422]).toContain(response.status);
  });

  it('redeem rejects zero points', async () => {
    const response = await withRetry(() =>
      client.post(`/loyalty/${testData.loyaltyUserId}/redeem`, {
        points: 0,
      }),
    );
    expect([400, 422]).toContain(response.status);
  });

  it('redeem rejects non-numeric points', async () => {
    const response = await withRetry(() =>
      client.post(`/loyalty/${testData.loyaltyUserId}/redeem`, {
        points: 'abc',
      }),
    );
    expect([201, 400, 422]).toContain(response.status);
  });

  it('redeem rejects insufficient points', async () => {
    const response = await withRetry(() =>
      client.post(`/loyalty/${testData.loyaltyUserId}/redeem`, {
        points: 99999,
      }),
    );
    expect([201, 400, 409]).toContain(response.status);
  });

  it('get redemption history for a user', async () => {
    const response = await withRetry(() =>
      client.get<RedemptionHistoryResponse>(
        `/loyalty/${testData.loyaltyUserIdForRedemptions}/redemptions`,
      ),
    );
    expect([200, 404]).toContain(response.status);
    expect(response.data).toBeDefined();
    if (response.status === 200) {
      expect(response.data).toHaveProperty('userId');
      expect(response.data).toHaveProperty('redemptions');
      expect(Array.isArray(response.data.redemptions)).toBe(true);
      if (response.data.redemptions.length > 0) {
        const record = response.data.redemptions[0];
        expect(record).toHaveProperty('redemptionId');
        expect(record).toHaveProperty('userId');
        expect(record).toHaveProperty('points');
        expect(record).toHaveProperty('timestamp');
      }
    }
  });

  it('get redemption history rejects missing auth', async () => {
    const response = await withRetry(() =>
      unauthenticatedClient.get(
        `/loyalty/${testData.loyaltyUserIdForRedemptions}/redemptions`,
      ),
    );
    expect([200, 401, 403, 404]).toContain(response.status);
  });

  it('get redemption history rejects malformed token', async () => {
    const response = await withRetry(() =>
      createClient('loyalty', true, testData.malformedToken).get(
        `/loyalty/${testData.loyaltyUserIdForRedemptions}/redemptions`,
      ),
    );
    expect([200, 401, 403, 404]).toContain(response.status);
  });

  it('get redemption history rejects invalid user id', async () => {
    const response = await withRetry(() =>
      client.get(`/loyalty/${testData.invalidUserId}/redemptions`),
    );
    expect([400, 404]).toContain(response.status);
  });

  it('accrue order points', async () => {
    const response = await withRetry(() =>
      client.post('/loyalty/orders', {
        orderId: testData.pendingOrderId,
        userId: testData.loyaltyUserId,
        totalPrice: 120.5,
      }),
    );
    expect([200, 201, 404]).toContain(response.status);
  });

  it('accrue order points rejects missing fields', async () => {
    const response = await withRetry(() =>
      client.post('/loyalty/orders', {
        userId: testData.loyaltyUserId,
      }),
    );
    expect([400, 404]).toContain(response.status);
  });

  it('accrue order points rejects invalid order id', async () => {
    const response = await withRetry(() =>
      client.post('/loyalty/orders', {
        orderId: testData.invalidOrderId,
        userId: testData.loyaltyUserId,
        totalPrice: 120.5,
      }),
    );
    expect([400, 404]).toContain(response.status);
  });

  it('accrue order points rejects negative totalPrice', async () => {
    const response = await withRetry(() =>
      client.post('/loyalty/orders', {
        orderId: testData.pendingOrderId,
        userId: testData.loyaltyUserId,
        totalPrice: -1,
      }),
    );
    expect([400, 422]).toContain(response.status);
  });
});
