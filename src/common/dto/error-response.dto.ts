import { ApiProperty } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiProperty({
    description: 'Always false for error responses',
    example: false,
    default: false,
  })
  success: false;

  @ApiProperty({
    description: 'Error code for programmatic handling',
    example: 'STOCK_001',
    examples: {
      STOCK_001: { value: 'STOCK_001', description: 'Invalid stock symbol' },
      STOCK_002: {
        value: 'STOCK_002',
        description: 'No data found for symbol',
      },
      API_001: { value: 'API_001', description: 'External API error' },
      RATE_LIMIT: { value: 'RATE_LIMIT', description: 'Rate limit exceeded' },
      VALIDATION_ERROR: {
        value: 'VALIDATION_ERROR',
        description: 'Request validation failed',
      },
    },
  })
  errorCode: string;

  @ApiProperty({
    description: 'Error message for end users',
    example: 'Invalid stock symbol: INVALID',
  })
  message: string;

  @ApiProperty({
    description: 'ISO 8601 timestamp when error occurred',
    example: '2025-08-09T10:30:01.000Z',
    format: 'date-time',
  })
  timestamp: string;

  @ApiProperty({
    description: 'Additional error context and details for debugging',
    required: false,
    example: {
      requestedSymbol: 'INVALID',
      validationErrors: ['Symbol must be 1-10 uppercase letters'],
      retryAfter: '2025-08-09T10:31:01.000Z',
    },
  })
  details?: Record<string, any>;

  constructor(errorCode: string, message: string, details?: Record<string, any>) {
    this.success = false;
    this.errorCode = errorCode;
    this.message = message;
    this.timestamp = new Date().toISOString();
    this.details = details;
  }
}
