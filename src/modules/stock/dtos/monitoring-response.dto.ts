import { ApiProperty } from '@nestjs/swagger';

export class MonitoringResponseDto {
  @ApiProperty({
    description: 'Stock symbol being monitored',
    example: 'AAPL',
  })
  symbol!: string;

  @ApiProperty({
    description: 'Whether monitoring is currently active',
    example: true,
  })
  isActive!: boolean;

  @ApiProperty({
    description: 'Timestamp of last price fetch attempt',
    example: '2025-08-09T10:25:00.000Z',
    nullable: true,
  })
  lastFetch!: Date | null;
}
