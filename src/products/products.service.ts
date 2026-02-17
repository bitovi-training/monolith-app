import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  availability: boolean;
}

export interface CreateProductDto {
  name: string;
  description?: string;
  price?: number;
  availability?: boolean;
}

@Injectable()
export class ProductsService {
  private products: Product[] = [
    {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Laptop Pro',
      description: 'High-performance laptop with 16GB RAM and 512GB SSD',
      price: 1299.99,
      availability: true,
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Wireless Mouse',
      description: 'Ergonomic wireless mouse with precision tracking',
      price: 29.99,
      availability: true,
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440002',
      name: 'Mechanical Keyboard',
      description: 'RGB mechanical keyboard with mechanical switches',
      price: 149.99,
      availability: true,
    },
  ];

  findAll(): { data: Product[]; count: number } {
    return {
      data: this.products,
      count: this.products.length,
    };
  }

  findOne(id: string): Product {
    const product = this.products.find((p) => p.id === id);
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    return product;
  }

  create(payload: CreateProductDto): Product {
    const product: Product = {
      id: randomUUID(),
      name: payload.name,
      description: payload.description ?? '',
      price: payload.price ?? 0.01,
      availability: payload.availability ?? true,
    };

    this.products.push(product);
    return product;
  }

  validateProduct(productId: string): { price: number; name: string } {
    const product = this.findOne(productId);
    if (!product.availability) {
      throw new NotFoundException(`Product ${productId} is not available`);
    }

    return {
      price: product.price,
      name: product.name,
    };
  }
}
