import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class LoyaltyClient {
  private readonly logger = new Logger(LoyaltyClient.name);

  constructor(private readonly httpService: HttpService) {}

  async accruePoints(
    userId: string,
    points: number,
    loyaltyServiceUrl: string,
    authToken?: string,
  ): Promise<void> {
    try {
      const url = `${loyaltyServiceUrl}/loyalty/${userId}/accrue`;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (authToken) {
        headers['Authorization'] = authToken;
      }

      await firstValueFrom(
        this.httpService.post(url, { points }, { headers }),
      );
    } catch (error) {
      this.logger.warn(
        `Failed to accrue loyalty points for user ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      // Don't throw - loyalty points accrual should not block order creation
    }
  }

  async getBalance(
    userId: string,
    loyaltyServiceUrl: string,
    authToken?: string,
  ): Promise<number> {
    try {
      const url = `${loyaltyServiceUrl}/loyalty/${userId}/balance`;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (authToken) {
        headers['Authorization'] = authToken;
      }

      const response = await firstValueFrom(
        this.httpService.get<{ balance: number }>(url, { headers }),
      );

      return response.data?.balance || 0;
    } catch (error) {
      this.logger.warn(
        `Failed to get loyalty balance for user ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return 0;
    }
  }
}
