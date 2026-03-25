import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { AuthGuard, RequireRolesGuard } from '@bitovi-training/auth-middleware';

describe('ProductsController', () => {
  let controller: ProductsController;

  const mockProductsService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        {
          provide: ProductsService,
          useValue: mockProductsService,
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RequireRolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ProductsController>(ProductsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // T013: Unit test for ProductsController.findAll()
  describe('findAll', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return result from service', () => {
      const mockResult = {
        data: [
          {
            id: 1,
            name: 'Test Product',
            description: 'Test description',
            price: 99.99,
            availability: true,
          },
        ],
        count: 1,
      };

      mockProductsService.findAll.mockReturnValue(mockResult);

      const result = controller.findAll();

      expect(result).toEqual(mockResult);
      expect(mockProductsService.findAll).toHaveBeenCalled();
    });

    it('should call service.findAll once', () => {
      mockProductsService.findAll.mockReturnValue({ data: [], count: 0 });

      controller.findAll();

      expect(mockProductsService.findAll).toHaveBeenCalledTimes(1);
    });
  });

  // T024: Unit test for ProductsController.findOne()
  describe('findOne', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return product from service', () => {
      const mockProduct = {
        id: 1,
        name: 'Test Product',
        description: 'Test description',
        price: 99.99,
        availability: true,
      };

      mockProductsService.findOne.mockReturnValue(mockProduct);

      const result = controller.findOne(1);

      expect(result).toEqual(mockProduct);
      expect(mockProductsService.findOne).toHaveBeenCalledWith(1);
    });

    it('should call service.findOne with numeric ID', () => {
      mockProductsService.findOne.mockReturnValue({
        id: 2,
        name: 'Product 2',
        description: 'Description 2',
        price: 49.99,
        availability: false,
      });

      controller.findOne(2);

      expect(mockProductsService.findOne).toHaveBeenCalledWith(2);
      expect(mockProductsService.findOne).toHaveBeenCalledTimes(1);
    });
  });

  // T005: Unit test for ProductsController.create()
  describe('create', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return created product from service', () => {
      const mockProduct = {
        id: 101,
        name: 'New Product',
        description: 'New description',
        price: 12.34,
        availability: true,
      };

      mockProductsService.create.mockReturnValue(mockProduct);

      const result = controller.create({
        name: 'New Product',
        description: 'New description',
        price: 12.34,
        availability: true,
      });

      expect(result).toEqual(mockProduct);
      expect(mockProductsService.create).toHaveBeenCalledWith({
        name: 'New Product',
        description: 'New description',
        price: 12.34,
        availability: true,
      });
    });

    it('should reject missing name via validation pipe', async () => {
      const pipe = new ValidationPipe({
        forbidNonWhitelisted: true,
        transform: true,
        whitelist: true,
      });

      await expect(
        pipe.transform(
          { description: 'Missing name' },
          { type: 'body', metatype: CreateProductDto },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
