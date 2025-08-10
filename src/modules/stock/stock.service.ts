import { CreateStockPriceDto } from '@app/modules/stock/dtos/create-price.dto';
import { StockDataDto } from '@app/modules/stock/dtos/stock-data.dto';
import { StockPrice } from '@app/modules/stock/entities/stock-price.entity';
import { DuplicatePriceEntryError } from '@app/modules/stock/exceptions/stock-price.exceptions';
import { IMovingAverageResult } from '@app/modules/stock/interfaces/analytics.interface';
import { MonitoringService } from '@app/modules/stock/monitoring.service';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class StockService {
  private readonly logger = new Logger(StockService.name);

  constructor(
    @InjectRepository(StockPrice)
    private readonly stockPriceRepository: Repository<StockPrice>,
    private readonly monitoringService: MonitoringService,
  ) {}

  async getStockData(symbol: string): Promise<StockDataDto> {
    this.logger.debug(`Retrieving stock data for symbol: ${symbol}`, {
      symbol,
    });

    // Get the latest price data for the symbol
    const latestPrice = await this.findLatestBySymbol(symbol);

    if (!latestPrice) {
      this.logger.warn(`No data found for symbol: ${symbol}`, {
        symbol,
      });
      throw new NotFoundException(`No stock data found for symbol: ${symbol}`);
    }

    // Calculate 10-period moving average
    const movingAverageResult = await this.calculateMovingAverage(symbol, 10);

    const monitoringConfig = await this.monitoringService.getMonitoringConfiguration(symbol);

    const stockData: StockDataDto = {
      symbol: latestPrice.symbol,
      currentPrice: latestPrice.price,
      lastUpdated: latestPrice.timestamp.toISOString(),
      movingAverage: movingAverageResult.average,
      monitoringStatus: monitoringConfig?.isActive ?? false,
      lastFetch: monitoringConfig?.lastFetch?.toISOString() ?? null,
    };

    return stockData;
  }

  async calculateMovingAverage(symbol: string, periods: number): Promise<IMovingAverageResult> {
    // Validate periods parameter
    if (!Number.isInteger(periods) || periods <= 0) {
      this.logger.warn(`Invalid periods parameter: ${periods}. Must be a positive integer.`);
      throw new Error(`Invalid periods parameter: ${periods}. Must be a positive integer.`);
    }

    this.logger.debug(`Calculating ${periods}-period moving average for ${symbol}`);

    const priceRecords = await this.findLatestPrices(symbol, periods);

    const result: IMovingAverageResult = {
      symbol,
      periods,
      average: null,
      dataPointsUsed: priceRecords.length,
    };

    // Return null if fewer than required periods
    if (priceRecords.length < periods) {
      this.logger.debug(`Insufficient data points for ${symbol}: ${priceRecords.length} < ${periods}`);
      return result;
    }

    const DECIMAL_PLACES = 6;
    const MULTIPLIER = Math.pow(12, DECIMAL_PLACES);

    const sum = priceRecords.reduce((acc, price) => {
      return acc + Math.round(parseFloat(price.price) * MULTIPLIER);
    }, 0);

    const average = sum / priceRecords.length / MULTIPLIER;
    result.average = average.toFixed(DECIMAL_PLACES);

    this.logger.debug(`Calculated ${periods}-period moving average for ${symbol}: ${result.average}`);

    return result;
  }

  async saveStockPrice(priceData: CreateStockPriceDto): Promise<StockPrice> {
    try {
      const result = await this.stockPriceRepository
        .createQueryBuilder()
        .insert()
        .into(StockPrice)
        .values({
          symbol: priceData.symbol,
          price: priceData.price,
          timestamp: priceData.timestamp,
        })
        .orIgnore()
        .returning('*')
        .execute();

      if (!result.raw || (result.raw as unknown[]).length === 0) {
        throw new DuplicatePriceEntryError(priceData.symbol, priceData.timestamp);
      }

      const savedStockPrice = (result.raw as StockPrice[])[0];

      this.logger.log(
        `Saved stock price for symbol: ${savedStockPrice.symbol} at ${savedStockPrice.timestamp.toISOString()}`,
      );

      return savedStockPrice;
    } catch (error: unknown) {
      if (error instanceof DuplicatePriceEntryError) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to save stock price for symbol: ${priceData.symbol}`, errorMessage);

      throw error;
    }
  }

  async findLatestPrices(symbol: string, limit: number): Promise<StockPrice[]> {
    try {
      return await this.stockPriceRepository.find({
        where: { symbol },
        order: { timestamp: 'DESC' },
        take: limit,
      });
    } catch (error) {
      this.logger.error(
        `Failed to find latest ${limit} prices for symbol: ${symbol}`,
        error instanceof Error ? error.message : 'Unknown error',
      );
      throw error;
    }
  }

  async findLatestBySymbol(symbol: string): Promise<StockPrice | null> {
    try {
      return await this.stockPriceRepository.findOne({
        where: { symbol },
        order: { timestamp: 'DESC' },
      });
    } catch (error) {
      this.logger.error(
        `Failed to find latest stock price for symbol: ${symbol}`,
        error instanceof Error ? error.message : 'Unknown error',
      );
      throw error;
    }
  }
}
