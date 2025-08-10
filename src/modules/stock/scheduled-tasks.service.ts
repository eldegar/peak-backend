import { STOCK_DATA_PROVIDER_TOKEN } from '@app/modules/stock/constants/stock-provider.constants';
import { StockMonitoring } from '@app/modules/stock/entities/stock-monitoring.entity';
import { IStockDataProvider } from '@app/modules/stock/interfaces/stock-data-provider.interface';
import { MonitoringService } from '@app/modules/stock/monitoring.service';
import { StockService } from '@app/modules/stock/stock.service';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CronExpression, SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';

interface SymbolProcessingResult {
  symbol: string;
  success: boolean;
  price?: number;
  error?: string;
}

@Injectable()
export class ScheduledTasksService implements OnModuleInit {
  private readonly logger = new Logger(ScheduledTasksService.name);

  private readonly maxConcurrentRequests: number;
  private readonly rateLimitDelay: number;

  constructor(
    private readonly monitoringService: MonitoringService,
    @Inject(STOCK_DATA_PROVIDER_TOKEN)
    private readonly stockDataProvider: IStockDataProvider,
    private readonly stockService: StockService,
    private readonly configService: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {
    this.maxConcurrentRequests = this.configService.get<number>('api.maxConcurrentRequests') || 5;
    this.rateLimitDelay = this.configService.get<number>('api.rateLimitDelay') || 1000;
  }

  onModuleInit() {
    const fetchInterval = this.configService.get<string>('api.fetchInterval') || CronExpression.EVERY_MINUTE;

    const job = new CronJob(
      fetchInterval,
      () => {
        void this.handleStockPriceFetching();
      },
      null,
      false,
      'UTC',
    );

    this.schedulerRegistry.addCronJob('stock-price-fetching', job);
    job.start();

    this.logger.log(`Stock price fetching scheduled with interval: ${fetchInterval}`);
  }

  async handleStockPriceFetching(): Promise<void> {
    this.logger.log('Starting scheduled stock price fetching job');
    await this.executeStockPriceFetching();
  }

  private async executeStockPriceFetching(): Promise<void> {
    const startTime = Date.now();

    this.logger.log('Starting scheduled stock price fetching job', {
      startTime: new Date().toISOString(),
    });

    try {
      // Get all active monitoring symbols
      const activeSymbols = await this.monitoringService.getMonitoredSymbols();

      if (activeSymbols.length === 0) {
        this.logger.debug('No active symbols to monitor');
        return;
      }

      this.logger.log(`Processing ${activeSymbols.length} active symbols`, {
        symbolCount: activeSymbols.length,
        symbols: activeSymbols.map((s) => s.symbol),
      });

      // Process symbols with concurrent limits and rate limiting
      const results = await this.processSymbolsWithConcurrencyControl(activeSymbols);

      const executionTime = Date.now() - startTime;
      const successCount = results.filter((r) => r.success).length;
      const failureCount = results.filter((r) => !r.success).length;

      this.logger.log('Stock price fetching job completed', {
        executionTime: `${executionTime}ms`,
        totalSymbols: results.length,
        successful: successCount,
        failed: failureCount,
        completedAt: new Date().toISOString(),
      });

      // Log failures with details
      if (failureCount > 0) {
        const failedSymbols = results.filter((r) => !r.success).map((r) => ({ symbol: r.symbol, error: r.error }));

        this.logger.warn('Some symbols failed to process', {
          failedSymbols,
        });
      }
    } catch (error) {
      const executionTime = Date.now() - startTime;

      this.logger.error('Stock price fetching job failed', {
        executionTime: `${executionTime}ms`,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async processSymbolsWithConcurrencyControl(symbols: StockMonitoring[]): Promise<SymbolProcessingResult[]> {
    const results: SymbolProcessingResult[] = [];

    for (let i = 0; i < symbols.length; i += this.maxConcurrentRequests) {
      const batch = symbols.slice(i, i + this.maxConcurrentRequests);

      const batchPromises = batch.map((symbol) => this.processSymbol(symbol));

      const batchResults = await Promise.allSettled(batchPromises);

      const batchProcessedResults = batchResults.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          return {
            symbol: batch[index].symbol,
            success: false,
            error: result.reason instanceof Error ? result.reason.message : String(result.reason),
          };
        }
      });

      results.push(...batchProcessedResults);

      // Add delay between batches to respect rate limits (except for last batch)
      if (i + this.maxConcurrentRequests < symbols.length) {
        await this.sleep(this.rateLimitDelay);
      }
    }

    return results;
  }

  private async processSymbol(monitoring: StockMonitoring): Promise<SymbolProcessingResult> {
    const symbol = monitoring.symbol;

    try {
      const quoteResponse = await this.stockDataProvider.getQuote(symbol);

      await this.stockService.saveStockPrice({
        symbol,
        price: quoteResponse.currentPrice.toString(),
        timestamp: new Date(),
      });

      await this.updateMonitoringStatus(monitoring);

      return {
        symbol,
        success: true,
        price: quoteResponse.currentPrice,
      };
    } catch (error) {
      this.logger.warn(`Failed to process symbol: ${symbol}`, {
        symbol,
        error: error instanceof Error ? error.message : String(error),
      });

      // Still try to update monitoring status even on failure
      try {
        await this.updateMonitoringStatus(monitoring);
      } catch (statusError) {
        this.logger.error(`Failed to update monitoring status for ${symbol}`, {
          symbol,
          statusError: statusError instanceof Error ? statusError.message : String(statusError),
        });
      }

      return {
        symbol,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async updateMonitoringStatus(monitoring: StockMonitoring): Promise<void> {
    const now = new Date();

    monitoring.lastFetch = now;

    await this.monitoringService.updateMonitoringStatus(monitoring.symbol, monitoring.isActive, monitoring.lastFetch);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
