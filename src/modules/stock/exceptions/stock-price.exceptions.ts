import { BadRequestException } from '@nestjs/common';

export class DuplicatePriceEntryError extends BadRequestException {
  constructor(symbol: string, timestamp: Date) {
    super({
      message: `Stock price entry already exists for symbol ${symbol} at ${timestamp.toISOString()}`,
      error: 'DUPLICATE_PRICE_ENTRY',
      symbol,
      timestamp: timestamp.toISOString(),
    });
  }
}
