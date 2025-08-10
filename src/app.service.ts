import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { HealthCheckDataDto } from './common/dto/api-response.dto';
import { FinnhubService } from './modules/external/finnhub/finnhub.service';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);
  private readonly startTime = Date.now();

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly finnhubService: FinnhubService,
  ) {}

  async getHealthStatus(): Promise<HealthCheckDataDto> {
    let databaseStatus = 'disconnected';
    let migrationStatus = 'unknown';
    let externalApiStatus = 'unavailable';

    // Check database status
    try {
      // Test database connection with a simple query
      if (this.dataSource.isInitialized) {
        await this.dataSource.query('SELECT 1 as health_check');
        databaseStatus = 'connected';

        // Check if migrations are up to date
        try {
          const pendingMigrations = await this.dataSource.showMigrations();
          migrationStatus = pendingMigrations ? 'pending' : 'up-to-date';
        } catch (migrationError) {
          this.logger.warn(
            'Could not check migration status:',
            migrationError instanceof Error ? migrationError.message : 'Unknown error',
          );
          migrationStatus = 'check-failed';
        }
      } else {
        databaseStatus = 'not-initialized';
      }
    } catch (error) {
      this.logger.error('Database health check failed:', error instanceof Error ? error.message : 'Unknown error');
      databaseStatus = 'error';
    }

    // Check Finnhub API status
    try {
      const testResponse = await Promise.race([
        this.finnhubService.getQuote('AAPL'), // Use a known symbol
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000)),
      ]);
      if (testResponse) {
        externalApiStatus = 'connected';
      }
    } catch (error) {
      this.logger.warn('External API health check failed:', error instanceof Error ? error.message : 'Unknown error');
      externalApiStatus = 'error';
    }

    // Determine overall status
    const overallStatus = databaseStatus === 'connected' && externalApiStatus === 'connected' ? 'healthy' : 'unhealthy';
    const uptime = Date.now() - this.startTime;

    const result: HealthCheckDataDto = {
      status: overallStatus,
      database: databaseStatus,
      externalApi: externalApiStatus,
      uptime,
      environment: this.configService.get<string>('NODE_ENV', 'development'),
    };

    // Add migration status if we have it
    if (migrationStatus !== 'unknown') {
      result.migration = migrationStatus;
    }

    return result;
  }
}
