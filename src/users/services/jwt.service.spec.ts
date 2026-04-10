import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from './jwt.service';

describe('JwtService', () => {
  let service: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [JwtService],
    }).compile();

    service = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    delete process.env.NODE_ENV;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const userId = 'user-123';
      const email = 'test@example.com';
      const roles = ['user'];

      const token = service.generateToken(userId, email, roles);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should include correct payload data', () => {
      const userId = 'user-123';
      const email = 'test@example.com';
      const roles = ['user', 'admin'];

      const token = service.generateToken(userId, email, roles);
      const [, payloadPart] = token.split('.');

      // Decode base64url
      const payload = JSON.parse(
        Buffer.from(
          payloadPart.replace(/-/g, '+').replace(/_/g, '/'),
          'base64',
        ).toString('utf-8'),
      );

      expect(payload.sub).toBe(userId);
      expect(payload.email).toBe(email);
      expect(payload.roles).toEqual(roles);
      expect(payload.iat).toBeDefined();
      expect(payload.exp).toBeDefined();
      expect(payload.exp).toBeGreaterThan(payload.iat);
    });

    it('should set expiration to 30 days in development', () => {
      process.env.NODE_ENV = 'development';

      const token = service.generateToken('user-123', 'test@example.com', ['user']);
      const [, payloadPart] = token.split('.');

      const payload = JSON.parse(
        Buffer.from(
          payloadPart.replace(/-/g, '+').replace(/_/g, '/'),
          'base64',
        ).toString('utf-8'),
      );

      const expectedExpiration = 30 * 24 * 60 * 60; // 30 days in seconds
      const actualExpiration = payload.exp - payload.iat;

      expect(actualExpiration).toBe(expectedExpiration);
    });

    it('should set expiration to 24 hours in production', () => {
      process.env.NODE_ENV = 'production';

      const token = service.generateToken('user-123', 'test@example.com', ['user']);
      const [, payloadPart] = token.split('.');

      const payload = JSON.parse(
        Buffer.from(
          payloadPart.replace(/-/g, '+').replace(/_/g, '/'),
          'base64',
        ).toString('utf-8'),
      );

      const expectedExpiration = 24 * 60 * 60; // 24 hours in seconds
      const actualExpiration = payload.exp - payload.iat;

      expect(actualExpiration).toBe(expectedExpiration);
    });

    it('should handle multiple roles', () => {
      const roles = ['user', 'admin', 'manager'];
      const token = service.generateToken('user-123', 'test@example.com', roles);
      const [, payloadPart] = token.split('.');

      const payload = JSON.parse(
        Buffer.from(
          payloadPart.replace(/-/g, '+').replace(/_/g, '/'),
          'base64',
        ).toString('utf-8'),
      );

      expect(payload.roles).toEqual(roles);
    });

    it('should handle empty roles array', () => {
      const roles: string[] = [];
      const token = service.generateToken('user-123', 'test@example.com', roles);
      const [, payloadPart] = token.split('.');

      const payload = JSON.parse(
        Buffer.from(
          payloadPart.replace(/-/g, '+').replace(/_/g, '/'),
          'base64',
        ).toString('utf-8'),
      );

      expect(payload.roles).toEqual([]);
    });

    it('should generate different tokens for different users', () => {
      const token1 = service.generateToken('user-1', 'user1@example.com', ['user']);
      const token2 = service.generateToken('user-2', 'user2@example.com', ['user']);

      expect(token1).not.toBe(token2);
    });
  });
});
