import { Controller, Get, Logger } from '@nestjs/common';

/**
 * HealthController
 * 
 * Provides health check endpoint for service monitoring.
 */
@Controller()
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  @Get('health')
  getHealth(): { status: string; timestamp: string } {
    this.logger.log('GET /health');
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
