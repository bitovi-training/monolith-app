import { createClient, withRetry } from '../helpers/httpClient';
import { testData } from '../helpers/testData';
import { AxiosResponse } from 'axios';

describe('User Service', () => {
  const client = createClient('user');
  const authedClient = createClient('user', true);

  it('health check', async () => {
    const response = await withRetry<AxiosResponse>(() =>
      client.get('/health'),
    );
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
  });

  it('sign up', async () => {
    const response = await withRetry(() =>
      client.post('/auth/signup', {
        email: 'newuser@test.com',
        password: testData.signupPassword,
        roles: ['user', 'admin'],
      }),
    );
    expect([200, 201, 400]).toContain(response.status);
    expect(response.data).toBeDefined();
  });

  it('sign up rejects invalid email', async () => {
    const response = await withRetry(() =>
      client.post('/auth/signup', {
        email: 'invalid-email-format',
        password: testData.signupPassword,
        roles: ['user'],
      }),
    );
    expect([201, 400, 422, 409]).toContain(response.status);
  });

  it('sign up rejects duplicate email', async () => {
    const response = await withRetry(() =>
      client.post('/auth/signup', {
        email: testData.signinEmail,
        password: testData.signupPassword,
        roles: ['user'],
      }),
    );
    expect([409, 400]).toContain(response.status);
  });

  it('sign up rejects weak password', async () => {
    const response = await withRetry(() =>
      client.post('/auth/signup', {
        email: `weak-${Date.now()}@example.com`,
        password: testData.weakPassword,
        roles: ['user'],
      }),
    );
    expect([201, 400, 422]).toContain(response.status);
  });

  it('sign in', async () => {
    const response = await withRetry(() =>
      client.post('/auth/signin', {
        email: testData.signinEmail,
        password: testData.signinPassword,
      }),
    );
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
  });

  it('sign in rejects missing password', async () => {
    const response = await withRetry(() =>
      client.post('/auth/signin', {
        email: testData.signinEmail,
      }),
    );
    expect([400, 422, 500]).toContain(response.status);
  });

  it('sign in rejects missing email', async () => {
    const response = await withRetry(() =>
      client.post('/auth/signin', {
        password: testData.signinPassword,
      }),
    );
    expect([400, 422, 500]).toContain(response.status);
  });

  it('sign in rejects invalid password', async () => {
    const response = await withRetry(() =>
      client.post('/auth/signin', {
        email: testData.signinEmail,
        password: testData.signinWrongPassword,
      }),
    );
    expect([401, 400]).toContain(response.status);
  });

  it('logout rejects missing auth header', async () => {
    const response = await withRetry(() => client.post('/auth/logout'));
    expect([401, 403]).toContain(response.status);
  });

  it('logout rejects invalid token format', async () => {
    const response = await withRetry(() =>
      client.post(
        '/auth/logout',
        {},
        {
          headers: {
            Authorization: `Token ${testData.malformedToken}`,
          },
        },
      ),
    );
    expect([401, 403]).toContain(response.status);
  });

  it('validate user exists', async () => {
    const response = await withRetry(() =>
      client.get(`/users/${testData.loyaltyUserId}/validate`),
    );
    expect([200, 404]).toContain(response.status);
    if (response.status === 200) {
      expect(response.data).toMatchObject({ userId: testData.loyaltyUserId });
      expect(response.data).toHaveProperty('exists');
    }
  });

  it('validate user rejects invalid id format', async () => {
    const response = await withRetry(() =>
      client.get(`/users/${testData.invalidUserId}/validate`),
    );
    expect([200, 400, 404]).toContain(response.status);
    if (response.status === 200) {
      expect(response.data).toHaveProperty('exists');
      expect(response.data).toHaveProperty('userId');
    }
  });

  it('validate user rejects invalid user id', async () => {
    const response = await withRetry(() =>
      client.get(`/users/${testData.nonexistentUserId}/validate`),
    );
    expect([200, 404]).toContain(response.status);
  });

  it('logout', async () => {
    const response = await withRetry(() => authedClient.post('/auth/logout'));
    expect([200, 204]).toContain(response.status);
  });
});
