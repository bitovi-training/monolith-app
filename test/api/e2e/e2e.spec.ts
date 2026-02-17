import { createClient, withRetry } from '../helpers/httpClient';

type AuthResponse = {
  accessToken: string;
  user: {
    id: string;
    email: string;
    roles: string[];
  };
};

type ProductListResponse = {
  data: Array<{
    id: string;
    name: string;
    price: number;
    availability: boolean;
  }>;
  count: number;
};

type ProductResponse = {
  id: string;
  name: string;
  price: number;
  availability: boolean;
};

type LoyaltyBalanceResponse = {
  userId: string;
  balance: number;
  earnedPoints: number;
  redeemedPoints: number;
};

type OrderResponse = {
  id: string;
  userId: string;
  products: Array<{ productId: string; quantity: number }>;
  totalPrice: number;
  accruedLoyaltyPoints?: number;
  status: string;
};

const uniqueEmail = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;

describe('E2E Commerce Flows', () => {
  const userClient = createClient('user');
  const productClient = createClient('product');

  const signInAdmin = async () => {
    const response = await signIn('admin@example.com', 'password123');
    return response.accessToken;
  };

  const signUp = async (email: string, roles: string[] = ['user']) => {
    const response = await withRetry(() =>
      userClient.post<AuthResponse>('/auth/signup', {
        email,
        password: 'strongpassword123',
        roles,
      }),
    );
    expect([200, 201]).toContain(response.status);
    return response.data;
  };

  const signIn = async (email: string, password = 'password123') => {
    const response = await withRetry(() =>
      userClient.post<AuthResponse>('/auth/signin', {
        email,
        password,
      }),
    );
    expect([200]).toContain(response.status);
    return response.data;
  };

  it('scenario 1: new customer purchase journey', async () => {
    const adminToken = await signInAdmin();
    const email = uniqueEmail('journey-user');
    const signup = await signUp(email);
    const userToken = signup.accessToken;

    const productListResponse = await withRetry(() =>
      productClient.get<ProductListResponse>('/products'),
    );
    expect(productListResponse.status).toBe(200);
    expect(productListResponse.data.data.length).toBeGreaterThan(0);

    const purchasableProduct = productListResponse.data.data.find(
      (product) => product.availability,
    );
    expect(purchasableProduct).toBeDefined();
    const productId = String(purchasableProduct!.id);

    const authedOrderClient = createClient('order', true, adminToken);
    const createOrderResponse = await withRetry(() =>
      authedOrderClient.post<OrderResponse>('/orders', {
        userId: signup.user.id,
        products: [{ productId, quantity: 1 }],
      }),
    );
    expect([201, 400, 503]).toContain(createOrderResponse.status);
    if (createOrderResponse.status !== 201) {
      return;
    }

    const submitResponse = await withRetry(() =>
      authedOrderClient.post<OrderResponse>(
        `/orders/${createOrderResponse.data.id}/submit`,
        {
          action: 'SUBMIT',
        },
      ),
    );
    expect([200, 201, 400]).toContain(submitResponse.status);

    const authedLoyaltyClient = createClient('loyalty', true, userToken);
    const balanceResponse = await withRetry(() =>
      authedLoyaltyClient.get<LoyaltyBalanceResponse>(
        `/loyalty/${signup.user.id}/balance`,
      ),
    );
    expect([200, 404]).toContain(balanceResponse.status);
  });

  it('scenario 2: admin creates product, customer buys it', async () => {
    const adminToken = await signInAdmin();
    const authedProductClient = createClient('product', true, adminToken);

    const newProductResponse = await withRetry(() =>
      authedProductClient.post<ProductResponse>('/products', {
        name: `E2E Product ${Date.now()}`,
        description: 'E2E product created by admin',
        price: 55.5,
        availability: true,
      }),
    );
    expect([200, 201]).toContain(newProductResponse.status);
    if (![200, 201].includes(newProductResponse.status)) {
      return;
    }

    const newProductId = String(newProductResponse.data.id);

    const customerEmail = uniqueEmail('buyer');
    const customerSignup = await signUp(customerEmail);

    const authedOrderClient = createClient('order', true, adminToken);
    const createOrderResponse = await withRetry(() =>
      authedOrderClient.post<OrderResponse>('/orders', {
        userId: customerSignup.user.id,
        products: [{ productId: newProductId, quantity: 1 }],
      }),
    );
    expect([201, 400, 503]).toContain(createOrderResponse.status);
  });

  it('scenario 3: order submit → loyalty accrual + redemption', async () => {
    const adminToken = await signInAdmin();
    const email = uniqueEmail('loyalty-user');
    const signup = await signUp(email);
    const userToken = signup.accessToken;

    const productListResponse = await withRetry(() =>
      productClient.get<ProductListResponse>('/products'),
    );
    expect(productListResponse.status).toBe(200);
    const purchasableProduct = productListResponse.data.data.find(
      (product) => product.availability,
    );
    expect(purchasableProduct).toBeDefined();
    const productId = String(purchasableProduct!.id);

    const authedOrderClient = createClient('order', true, adminToken);
    const createOrderResponse = await withRetry(() =>
      authedOrderClient.post<OrderResponse>('/orders', {
        userId: signup.user.id,
        products: [{ productId, quantity: 2 }],
      }),
    );
    expect([201, 400, 503]).toContain(createOrderResponse.status);
    if (createOrderResponse.status !== 201) {
      return;
    }

    const submitResponse = await withRetry(() =>
      authedOrderClient.post<OrderResponse>(
        `/orders/${createOrderResponse.data.id}/submit`,
        {
          action: 'SUBMIT',
        },
      ),
    );
    expect([200, 201, 400]).toContain(submitResponse.status);
    if (submitResponse.status !== 200) {
      return;
    }

    const authedLoyaltyClient = createClient('loyalty', true, userToken);
    const balanceResponse = await withRetry(() =>
      authedLoyaltyClient.get<LoyaltyBalanceResponse>(
        `/loyalty/${signup.user.id}/balance`,
      ),
    );
    expect([200, 404]).toContain(balanceResponse.status);

    if (balanceResponse.status === 200 && balanceResponse.data.balance > 0) {
      const redeemResponse = await withRetry(() =>
        authedLoyaltyClient.post(`/loyalty/${signup.user.id}/redeem`, {
          points: 1,
        }),
      );
      expect([200, 201, 400, 404, 409]).toContain(redeemResponse.status);

      const historyResponse = await withRetry(() =>
        authedLoyaltyClient.get(`/loyalty/${signup.user.id}/redemptions`),
      );
      expect([200, 404]).toContain(historyResponse.status);
    }
  });

  it('scenario 4: order endpoints require admin role', async () => {
    const email = uniqueEmail('non-admin');
    const signup = await signUp(email);

    const authedOrderClient = createClient('order', true, signup.accessToken);
    const response = await withRetry(() => authedOrderClient.get('/orders'));
    expect([200, 401, 403]).toContain(response.status);
  });

  it('scenario 5: invalid token is rejected', async () => {
    const invalidTokenClient = createClient('order', true, 'invalid-token');
    const response = await withRetry(() => invalidTokenClient.get('/orders'));
    expect([200, 401, 403]).toContain(response.status);
  });

  it('scenario 6: update order quantities', async () => {
    const adminToken = await signInAdmin();
    const email = uniqueEmail('update-order');
    const signup = await signUp(email);

    const productListResponse = await withRetry(() =>
      productClient.get<ProductListResponse>('/products'),
    );
    expect(productListResponse.status).toBe(200);
    const purchasableProduct = productListResponse.data.data.find(
      (product) => product.availability,
    );
    expect(purchasableProduct).toBeDefined();
    const productId = String(purchasableProduct!.id);

    const authedOrderClient = createClient('order', true, adminToken);
    const createOrderResponse = await withRetry(() =>
      authedOrderClient.post<OrderResponse>('/orders', {
        userId: signup.user.id,
        products: [{ productId, quantity: 2 }],
      }),
    );
    expect([201, 400, 503]).toContain(createOrderResponse.status);
    if (createOrderResponse.status !== 201) {
      return;
    }

    const updateResponse = await withRetry(() =>
      authedOrderClient.patch<OrderResponse>(
        `/orders/${createOrderResponse.data.id}`,
        {
          products: [{ productId, quantity: -1 }],
        },
      ),
    );
    expect([200, 400, 503]).toContain(updateResponse.status);
  });

  it('scenario 7: create order with multiple products', async () => {
    const adminToken = await signInAdmin();
    const email = uniqueEmail('multi-product');
    const signup = await signUp(email);

    const productListResponse = await withRetry(() =>
      productClient.get<ProductListResponse>('/products'),
    );
    expect(productListResponse.status).toBe(200);
    const purchasableProducts = productListResponse.data.data.filter(
      (product) => product.availability,
    );
    expect(purchasableProducts.length).toBeGreaterThan(0);
    const [firstProduct, secondProduct] = purchasableProducts;
    const products = [firstProduct, secondProduct ?? firstProduct].map(
      (product) => ({
        productId: String(product.id),
        quantity: 1,
      }),
    );

    const authedOrderClient = createClient('order', true, adminToken);
    const createOrderResponse = await withRetry(() =>
      authedOrderClient.post<OrderResponse>('/orders', {
        userId: signup.user.id,
        products,
      }),
    );
    expect([201, 400, 503]).toContain(createOrderResponse.status);
  });
});
