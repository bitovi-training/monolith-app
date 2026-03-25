import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { UsersModule } from '../users.module';

describe('Auth E2E Tests', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [UsersModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply the same global configurations as in main.ts
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

  describe('/auth/signup (POST)', () => {
    it('should successfully sign up a new user', () => {
      const signUpDto = {
        email: 'newuser@example.com',
        password: 'password123',
        roles: ['user'],
      };

      return request(app.getHttpServer())
        .post('/auth/signup')
        .send(signUpDto)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('user');
          expect(res.body.user.email).toBe(signUpDto.email);
          expect(res.body.user.roles).toEqual(signUpDto.roles);
          expect(res.body.user).toHaveProperty('id');
        });
    });

    it('should return 409 if email already exists', async () => {
      const signUpDto = {
        email: 'duplicate@example.com',
        password: 'password123',
      };

      // First signup should succeed
      await request(app.getHttpServer())
        .post('/auth/signup')
        .send(signUpDto)
        .expect(201);

      // Second signup with same email should fail
      return request(app.getHttpServer())
        .post('/auth/signup')
        .send(signUpDto)
        .expect(409)
        .expect((res) => {
          expect(res.body.message).toBe('Email already registered');
        });
    });

    it('should return 400 if email is invalid', () => {
      const signUpDto = {
        email: 'invalid-email',
        password: 'password123',
      };

      return request(app.getHttpServer())
        .post('/auth/signup')
        .send(signUpDto)
        .expect(400);
    });

    it('should return 400 if password is missing', () => {
      const signUpDto = {
        email: 'test@example.com',
      };

      return request(app.getHttpServer())
        .post('/auth/signup')
        .send(signUpDto)
        .expect(400);
    });

    it('should return 400 if password is too short', () => {
      const signUpDto = {
        email: 'test@example.com',
        password: '123',
      };

      return request(app.getHttpServer())
        .post('/auth/signup')
        .send(signUpDto)
        .expect(400);
    });

    it('should use default "user" role when roles not provided', () => {
      const signUpDto = {
        email: 'defaultrole@example.com',
        password: 'password123',
      };

      return request(app.getHttpServer())
        .post('/auth/signup')
        .send(signUpDto)
        .expect(201)
        .expect((res) => {
          expect(res.body.user.roles).toEqual(['user']);
        });
    });
  });

  describe('/auth/signin (POST)', () => {
    const testUser = {
      email: 'signintest@example.com',
      password: 'password123',
    };

    beforeAll(async () => {
      // Create a test user
      await request(app.getHttpServer())
        .post('/auth/signup')
        .send(testUser)
        .expect(201);
    });

    it('should successfully sign in with valid credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/signin')
        .send(testUser)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('user');
          expect(res.body.user.email).toBe(testUser.email);
        });
    });

    it('should sign in with seeded admin user', () => {
      return request(app.getHttpServer())
        .post('/auth/signin')
        .send({
          email: 'admin@example.com',
          password: 'password123',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.user.email).toBe('admin@example.com');
          expect(res.body.user.roles).toContain('admin');
        });
    });

    it('should return 401 for invalid password', () => {
      return request(app.getHttpServer())
        .post('/auth/signin')
        .send({
          email: testUser.email,
          password: 'wrongpassword',
        })
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toBe('Invalid credentials');
        });
    });

    it('should return 401 for non-existent user', () => {
      return request(app.getHttpServer())
        .post('/auth/signin')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123',
        })
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toBe('Invalid credentials');
        });
    });

    it('should return 400 if email is missing', () => {
      return request(app.getHttpServer())
        .post('/auth/signin')
        .send({
          password: 'password123',
        })
        .expect(400);
    });

    it('should return 400 if password is missing', () => {
      return request(app.getHttpServer())
        .post('/auth/signin')
        .send({
          email: testUser.email,
        })
        .expect(400);
    });
  });

  describe('/auth/logout (POST)', () => {
    let accessToken: string;

    beforeEach(async () => {
      // Sign in to get a token
      const response = await request(app.getHttpServer())
        .post('/auth/signin')
        .send({
          email: 'admin@example.com',
          password: 'password123',
        })
        .expect(200);

      accessToken = response.body.accessToken;
    });

    it('should successfully logout with valid token', () => {
      return request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.message).toBe('Logged out successfully');
        });
    });

    it('should return 401 when token does not have Bearer prefix', () => {
      return request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', accessToken)
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toBe(
            'Missing or invalid Authorization header',
          );
        });
    });

    it('should return 401 when authorization header is missing', () => {
      return request(app.getHttpServer())
        .post('/auth/logout')
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toBe(
            'Missing or invalid Authorization header',
          );
        });
    });

    it('should return 401 when authorization header is empty', () => {
      return request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', '')
        .expect(401);
    });
  });

  describe('Complete auth flow', () => {
    it('should successfully complete signup -> signin -> logout flow', async () => {
      const newUser = {
        email: `flow-${Date.now()}@example.com`,
        password: 'password123',
        roles: ['user'],
      };

      // 1. Sign up
      const signupResponse = await request(app.getHttpServer())
        .post('/auth/signup')
        .send(newUser)
        .expect(201);

      expect(signupResponse.body).toHaveProperty('accessToken');
      const signupToken = signupResponse.body.accessToken;

      // 2. Sign in
      const signinResponse = await request(app.getHttpServer())
        .post('/auth/signin')
        .send({
          email: newUser.email,
          password: newUser.password,
        })
        .expect(200);

      expect(signinResponse.body).toHaveProperty('accessToken');
      const signinToken = signinResponse.body.accessToken;

      // 3. Logout
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${signinToken}`)
        .expect(200);
    });
  });
});
