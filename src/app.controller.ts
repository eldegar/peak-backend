import { AppService } from '@app/app.service';
import { HealthCheckDataDto } from '@app/common/dto/api-response.dto';
import { ErrorResponseDto } from '@app/common/dto/error-response.dto';
import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Response } from 'express';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  @SkipThrottle()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({
    status: 200,
    description: 'Application is healthy',
    type: HealthCheckDataDto,
  })
  @ApiResponse({
    status: 503,
    description: 'Application is unhealthy',
    type: HealthCheckDataDto,
  })
  @ApiResponse({
    status: 500,
    description: 'Health check failed due to internal error',
    type: ErrorResponseDto,
  })
  async getHealth(@Res() res: Response): Promise<Response> {
    try {
      const healthData = await this.appService.getHealthStatus();
      const isHealthy = healthData.status === 'healthy';
      const statusCode = isHealthy ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;
      const message = isHealthy ? 'Application is healthy' : 'Application is unhealthy';

      return res.status(statusCode).json(message);
    } catch {
      return res.status(HttpStatus.SERVICE_UNAVAILABLE).json('Health check failed');
    }
  }
}
