import { ApiProperty } from '@nestjs/swagger';

export class HealthCheckDataDto {
  @ApiProperty({
    description: 'Overall application health status',
    enum: ['healthy', 'unhealthy'],
    example: 'healthy',
  })
  status!: 'healthy' | 'unhealthy';

  @ApiProperty({
    description: 'Database connection status message',
    example: 'Connected to PostgreSQL database',
  })
  database!: string;

  @ApiProperty({
    description: 'Database migration status (if applicable)',
    example: 'All migrations up to date',
    required: false,
  })
  migration?: string;

  @ApiProperty({
    description: 'External API connectivity status',
    example: 'Finnhub API: Connected (response time: 120ms)',
  })
  externalApi!: string;

  @ApiProperty({
    description: 'Application uptime in milliseconds',
    example: 1800000,
    minimum: 0,
  })
  uptime!: number;

  @ApiProperty({
    description: 'Current deployment environment',
    example: 'production',
    enum: ['development', 'production', 'test'],
  })
  environment!: string;
}
