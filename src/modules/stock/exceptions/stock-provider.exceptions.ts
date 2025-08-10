import { BadRequestException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';

export class InvalidSymbolError extends BadRequestException {
  constructor(symbol: string) {
    super({
      message: `Invalid stock symbol: ${symbol}`,
      errorCode: 'STOCK_001',
    });
  }
}

export class StockDataProviderError extends ServiceUnavailableException {
  constructor(
    message: string,
    public readonly provider?: string,
  ) {
    super({
      message: `Stock data provider error${provider ? ` (${provider})` : ''}: ${message}`,
      errorCode: 'PROVIDER_001',
    });
  }
}

export class StockDataProviderUnauthorizedError extends UnauthorizedException {
  constructor(provider?: string) {
    super({
      message: `Invalid or missing API key${provider ? ` for ${provider}` : ''}`,
      errorCode: 'PROVIDER_002',
    });
  }
}

export class StockDataProviderRateLimitError extends ServiceUnavailableException {
  constructor(provider?: string) {
    super({
      message: `Rate limit exceeded${provider ? ` for ${provider}` : ''}`,
      errorCode: 'PROVIDER_003',
    });
  }
}
