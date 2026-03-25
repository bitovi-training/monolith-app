import {
  Body,
  Controller,
  Get,
  Logger,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from "@nestjs/common";
import { CreateProductDto } from "./dto/create-product.dto";
import { ProductsService } from "./products.service";
import type { Product } from "./entities/product.entity";
import {
  AuthGuard,
  RequireRolesGuard,
  Roles,
} from "@bitovi-training/auth-middleware";

@Controller("products")
export class ProductsController {
  private readonly logger = new Logger(ProductsController.name);

  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll() {
    const result = this.productsService.findAll();
    this.logger.log(`GET /products - Returning ${result.count} products`);
    return result;
  }

  @UseGuards(AuthGuard)
  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number): Product {
    this.logger.log(`GET /products/${id} - Fetching product details`);

    try {
      const product = this.productsService.findOne(id);
      this.logger.log(`GET /products/${id} - Product found`);
      return product;
    } catch (error) {
      this.logger.error(
        `GET /products/${id} - Product not found`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  @UseGuards(AuthGuard, RequireRolesGuard)
  @Roles("admin")
  @Post()
  create(@Body() payload: CreateProductDto): Product {
    this.logger.log("POST /products - Creating product");
    const product = this.productsService.create(payload);
    this.logger.log(`POST /products - Created product ${product.id}`);
    return product;
  }
}
