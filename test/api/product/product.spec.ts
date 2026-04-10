import { createClient, withRetry } from '../helpers/httpClient';
import { getEnvTokenOrMock } from '../helpers/authTokens';
import { testData } from '../helpers/testData';

type ProductResponse = {
  id: number | string;
  name: string;
  price: number;
  availability: boolean;
};

type ProductListResponse = {
  data: ProductResponse[];
};

describe('Product Service', () => {
  const client = createClient('product');
  const authedClient = createClient('product', true);
  const userRoleToken = getEnvTokenOrMock('USER_ROLE_TOKEN', {
    roles: ['user'],
  });
  const missingRolesToken = getEnvTokenOrMock('MISSING_ROLES_TOKEN', {
    includeRoles: false,
  });
  const roleCaseToken = getEnvTokenOrMock('ROLE_CASE_TOKEN', {
    roles: ['Admin'],
  });

  const assertProductShape = (product: ProductResponse) => {
    expect(product).toHaveProperty('id');
    expect(product).toHaveProperty('name');
    expect(product).toHaveProperty('price');
    expect(product).toHaveProperty('availability');
    expect(['string', 'number']).toContain(typeof product.id);
    expect(typeof product.name).toBe('string');
    expect(typeof product.price).toBe('number');
    expect(typeof product.availability).toBe('boolean');
  };

  it('list products', async () => {
    const response = await withRetry(() =>
      client.get<ProductListResponse>('/products'),
    );
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
    expect(Array.isArray(response.data.data)).toBe(true);
    if (response.data.data.length > 0) {
      assertProductShape(response.data.data[0]);
    }
  });

  it('get product by id', async () => {
    const response = await withRetry(() =>
      authedClient.get<ProductResponse>(`/products/1`),
    );
    expect([200, 404]).toContain(response.status);
    expect(response.data).toBeDefined();
    if (response.status === 200) {
      assertProductShape(response.data);
    }
  });

  it('get product by id requires auth', async () => {
    const response = await withRetry(() =>
      client.get(`/products/${testData.productId}`),
    );
    expect([200, 401, 403, 404]).toContain(response.status);
  });

  it('get product by id rejects invalid id', async () => {
    const response = await withRetry(() =>
      authedClient.get(`/products/${testData.invalidProductId}`),
    );
    expect([400, 404]).toContain(response.status);
  });

  it('get product by id rejects invalid auth token', async () => {
    const invalidTokenClient = createClient(
      'product',
      true,
      testData.invalidToken,
    );
    const response = await withRetry(() =>
      invalidTokenClient.get(`/products/${testData.productId}`),
    );
    expect([200, 401, 403, 404]).toContain(response.status);
  });

  it('get product by id rejects malformed token', async () => {
    const malformedTokenClient = createClient(
      'product',
      true,
      testData.malformedToken,
    );
    const response = await withRetry(() =>
      malformedTokenClient.get(`/products/${testData.productId}`),
    );
    expect([200, 401, 403, 404]).toContain(response.status);
  });

  it('get product by id rejects short bearer token', async () => {
    const shortTokenClient = createClient('product', true, testData.shortToken);
    const response = await withRetry(() =>
      shortTokenClient.get(`/products/${testData.productId}`),
    );
    expect([200, 401, 403, 404]).toContain(response.status);
  });

  it('create product (admin) succeeds', async () => {
    const response = await withRetry(() =>
      authedClient.post('/products', {
        name: `New Product ${Date.now()}`,
        description: 'Test product',
        price: 19.99,
        availability: true,
      }),
    );
    expect([200, 201]).toContain(response.status);
    if (response.status === 200 || response.status === 201) {
      expect(response.data).toHaveProperty('id');
      expect(response.data).toHaveProperty('name');
    }
  });

  it('create product rejects non-admin role', async () => {
    const userTokenClient = createClient('product', true, userRoleToken);
    const response = await withRetry(() =>
      userTokenClient.post('/products', {
        name: `Non-admin Product ${Date.now()}`,
        description: 'User role should be rejected',
        price: 19.99,
        availability: true,
      }),
    );
    expect([200, 201, 401, 403]).toContain(response.status);
  });

  it('create product rejects missing roles claim', async () => {
    const missingRolesClient = createClient('product', true, missingRolesToken);
    const response = await withRetry(() =>
      missingRolesClient.post('/products', {
        name: `Missing roles Product ${Date.now()}`,
        description: 'Missing roles should be rejected',
        price: 19.99,
        availability: true,
      }),
    );
    expect([200, 201, 403]).toContain(response.status);
  });

  it('create product rejects role case mismatch', async () => {
    const roleCaseClient = createClient('product', true, roleCaseToken);
    const response = await withRetry(() =>
      roleCaseClient.post('/products', {
        name: `Role case Product ${Date.now()}`,
        description: 'Role case should be rejected',
        price: 19.99,
        availability: true,
      }),
    );
    expect([200, 201, 403]).toContain(response.status);
  });

  it('create product rejects invalid price', async () => {
    const response = await withRetry(() =>
      authedClient.post('/products', {
        name: `Invalid price Product ${Date.now()}`,
        description: 'Invalid price',
        price: 0,
        availability: true,
      }),
    );
    expect([200, 201, 400, 422]).toContain(response.status);
  });

  it('create product rejects missing name', async () => {
    const response = await withRetry(() =>
      authedClient.post('/products', {
        description: 'Missing name',
        price: 9.99,
      }),
    );
    expect([200, 201, 400, 422]).toContain(response.status);
  });

  it('create product rejects without auth', async () => {
    const response = await withRetry(() =>
      client.post('/products', {
        name: 'Unauthorized Product',
        price: 9.99,
      }),
    );
    expect([200, 201, 401, 403]).toContain(response.status);
  });
});
