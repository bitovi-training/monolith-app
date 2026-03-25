import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from './../src/app.module';

describe('Products contract', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        forbidNonWhitelisted: true,
        transform: true,
        whitelist: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('POST /products returns Product schema with 201', () => {
    return request(app.getHttpServer())
      .post('/products')
      .send({
        name: 'Laptop Pro',
        description: 'High-performance laptop with 16GB RAM and 512GB SSD',
        price: 1299.99,
        availability: true,
      })
      .expect(201)
      .expect((res) => {
        expect(res.body).toEqual({
          id: expect.any(Number),
          name: 'Laptop Pro',
          description: 'High-performance laptop with 16GB RAM and 512GB SSD',
          price: 1299.99,
          availability: true,
        });
      });
  });

  it('POST /products returns ErrorResponse with 400 on missing name', () => {
    return request(app.getHttpServer())
      .post('/products')
      .send({ description: 'Missing name' })
      .expect(400)
      .expect((res) => {
        expect(res.body).toHaveProperty('statusCode');
        expect(res.body.statusCode).toBe(400);
        expect(res.body).toHaveProperty('message');
      });
  });
});
