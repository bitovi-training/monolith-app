import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { Product } from './entities/product.entity';

@Injectable()
export class ProductsService {
  private products: Product[] = [
    {
      id: 1,
      name: 'Laptop Pro',
      description: 'High-performance laptop with 16GB RAM and 512GB SSD',
      price: 1299.99,
      availability: true,
    },
    {
      id: 2,
      name: 'Wireless Mouse',
      description: 'Ergonomic wireless mouse with precision tracking',
      price: 29.99,
      availability: true,
    },
    {
      id: 3,
      name: 'Mechanical Keyboard',
      description: 'RGB mechanical keyboard with cherry MX switches',
      price: 149.99,
      availability: true,
    },
    {
      id: 4,
      name: 'USB-C Hub',
      description: '7-in-1 USB-C hub with HDMI, USB 3.0, and SD card reader',
      price: 49.99,
      availability: false,
    },
    {
      id: 5,
      name: 'Laptop Stand',
      description: 'Adjustable aluminum laptop stand for better ergonomics',
      price: 39.99,
      availability: true,
    },
  ];
  private nextId = this.products.length + 1;

  findAll(): { data: Product[]; count: number } {
    return {
      data: this.products,
      count: this.products.length,
    };
  }

  findOne(id: number): Product {
    const product = this.products.find((p) => p.id === id);

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return product;
  }

  create(payload: CreateProductDto): Product {
    const product: Product = {
      id: this.nextId++,
      name: payload.name,
      description: payload.description ?? '',
      price: payload.price ?? 0.01,
      availability: payload.availability ?? true,
    };

    this.products.push(product);

    return product;
  }
}
