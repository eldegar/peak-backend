import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class StockDataDto {
  @ApiProperty({
    description: 'Stock symbol',
    example: 'AAPL',
  })
  @IsString()
  @IsNotEmpty()
  symbol!: string;

  @ApiProperty({
    description: 'Current stock price',
    example: '150.2500',
  })
  @IsString()
  @IsNotEmpty()
  currentPrice!: string;

  @ApiProperty({
    description: 'Timestamp of the latest price data',
    example: '2025-08-09T10:30:00.000Z',
  })
  @IsDateString()
  lastUpdated!: string;

  @ApiProperty({
    description: '10-period moving average',
    example: '148.7500',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  movingAverage!: string | null;

  @ApiProperty({
    description: 'Whether this symbol is being monitored for automatic price updates',
    example: true,
  })
  @IsBoolean()
  monitoringStatus!: boolean;

  @ApiProperty({
    description: 'Timestamp of the last monitoring fetch (null if never fetched)',
    example: '2025-08-09T10:25:00.000Z',
    nullable: true,
  })
  @IsOptional()
  @IsDateString()
  lastFetch!: string | null;
}
