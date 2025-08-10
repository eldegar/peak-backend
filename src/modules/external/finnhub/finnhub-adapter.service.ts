import { FinnhubService } from '@app/modules/external/finnhub/finnhub.service';
import { IStockDataProvider, StockQuote } from '@app/modules/stock/interfaces/stock-data-provider.interface';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class FinnhubAdapterService implements IStockDataProvider {
  private readonly logger = new Logger(FinnhubAdapterService.name);

  constructor(private readonly finnhubService: FinnhubService) {}

  async getQuote(symbol: string): Promise<StockQuote> {
    const response = await this.finnhubService.getQuote(symbol);

    return {
      symbol: symbol.toUpperCase(),
      currentPrice: response.c,
      change: response.d,
      changePercent: response.dp,
      high: response.h,
      low: response.l,
      open: response.o,
      previousClose: response.pc,
      timestamp: new Date(response.t * 1000), // Convert Unix timestamp to Date
    };
  }

  async isHealthy(): Promise<boolean> {
    try {
      // Test with a known valid symbol
      await this.finnhubService.getQuote('AAPL');
      return true;
    } catch (error) {
      this.logger.warn('Finnhub health check failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }
}
