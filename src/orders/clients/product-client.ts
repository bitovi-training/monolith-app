import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface ProductInfo {
  id: string;
  name: string;
  price: number;
}

@Injectable()
export class ProductClient {
  private readonly logger = new Logger(ProductClient.name);

  constructor(private readonly httpService: HttpService) {}

  async validateProduct(
    productId: string,
    productServiceUrl: string,
    authToken?: string,
  ): Promise<{ price: number; name: string }> {
    try {
      const url = `${productServiceUrl}/products/${productId}`;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (authToken) {
        headers['Authorization'] = authToken;
      }

      const response = await firstValueFrom(
        this.httpService.get<ProductInfo>(url, { headers }),
      );

      if (!response.data || !response.data.price) {
        throw new HttpException(
          'Invalid product data from Product Service',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      return {
        price: response.data.price,
        name: response.data.name || 'Unknown',
      };
    } catch (error) {
      this.logger.error(
        `Failed to validate product ${productId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );

      if (error instanceof HttpException) {
        throw error;
      }

      if (error instanceof Error && error.message.includes('404')) {
        throw new HttpException('Product not found', HttpStatus.NOT_FOUND);
      }

      throw new HttpException(
        'Product Service unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}
