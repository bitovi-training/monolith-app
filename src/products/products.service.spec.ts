import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';

describe('ProductsService', () => {
  let service: ProductsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProductsService],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // T012: Unit test for ProductsService.findAll()
  describe('findAll', () => {
    it('should return an object with data array and count', () => {
      const result = service.findAll();

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('count');
      expect(Array.isArray(result.data)).toBe(true);
      expect(typeof result.count).toBe('number');
    });

    it('should return products with all required fields', () => {
      const result = service.findAll();

      expect(result.data.length).toBeGreaterThan(0);

      result.data.forEach((product) => {
        expect(product).toHaveProperty('id');
        expect(product).toHaveProperty('name');
        expect(product).toHaveProperty('description');
        expect(product).toHaveProperty('price');
        expect(product).toHaveProperty('availability');
        expect(typeof product.id).toBe('number');
        expect(typeof product.name).toBe('string');
        expect(typeof product.description).toBe('string');
        expect(typeof product.price).toBe('number');
        expect(typeof product.availability).toBe('boolean');
      });
    });

    it('should return count matching data array length', () => {
      const result = service.findAll();

      expect(result.count).toBe(result.data.length);
    });
  });

  // T023: Unit test for ProductsService.findOne()
  describe('findOne', () => {
    it('should return a product for valid ID', () => {
      const product = service.findOne(1);

      expect(product).toBeDefined();
      expect(product).toHaveProperty('id');
      expect(product).toHaveProperty('name');
      expect(product).toHaveProperty('description');
      expect(product).toHaveProperty('price');
      expect(product).toHaveProperty('availability');
      expect(product.id).toBe(1);
    });

    it('should throw NotFoundException for non-existent ID', () => {
      expect(() => service.findOne(999)).toThrow();
    });

    it('should return product with all attributes', () => {
      const product = service.findOne(1);

      expect(typeof product.id).toBe('number');
      expect(typeof product.name).toBe('string');
      expect(typeof product.description).toBe('string');
      expect(typeof product.price).toBe('number');
      expect(typeof product.availability).toBe('boolean');
    });
  });

  // T004: Unit test for ProductsService.create()
  describe('create', () => {
    it('should return created product with generated id', () => {
      const product = service.create({
        name: 'New Product',
        description: 'New description',
        price: 12.34,
        availability: false,
      });

      expect(product).toHaveProperty('id');
      expect(typeof product.id).toBe('number');
      expect(product.name).toBe('New Product');
      expect(product.description).toBe('New description');
      expect(product.price).toBe(12.34);
      expect(product.availability).toBe(false);
    });

    it('should apply defaults for optional fields', () => {
      const product = service.create({ name: 'Minimal Product' });

      expect(product.description).toBe('');
      expect(product.price).toBe(0.01);
      expect(product.availability).toBe(true);
    });
  });
});
