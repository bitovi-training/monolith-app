import axios, { AxiosInstance } from 'axios';
import { getEnvTokenOrMock } from './authTokens';

const { MONOLITH_APP_URL, BEARER_TOKEN } = process.env;

const baseUrl = MONOLITH_APP_URL ?? 'http://localhost:3000';

const serviceUrls: Record<'user' | 'order' | 'product' | 'loyalty', string> = {
  user: baseUrl,
  product: baseUrl,
  loyalty: baseUrl,
  order: 'http://localhost:8080',
};

export const withRetry = async <T>(
  fn: () => Promise<T>,
  retries = 5,
  delayMs = 1000,
): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) {
      throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return withRetry(fn, retries - 1, delayMs);
  }
};

export const createClient = (
  service: 'user' | 'order' | 'product' | 'loyalty',
  useAuth = false,
  token?: string,
): AxiosInstance => {
  const headers: Record<string, string> = {};
  if (useAuth) {
    const authToken =
      token ??
      BEARER_TOKEN ??
      getEnvTokenOrMock('BEARER_TOKEN', { roles: ['admin'] });
    headers.Authorization = `Bearer ${authToken}`;
  }
  return axios.create({
    baseURL: serviceUrls[service],
    headers,
    validateStatus: () => true,
  });
};
