import { ErrorResponseDto } from '@app/common/dto/error-response.dto';
import { STOCK_DATA_PROVIDER_TOKEN } from '@app/modules/stock/constants/stock-provider.constants';
import { CreateStockPriceDto } from '@app/modules/stock/dtos/create-price.dto';
import { MonitoringResponseDto } from '@app/modules/stock/dtos/monitoring-response.dto';
import { StockDataDto } from '@app/modules/stock/dtos/stock-data.dto';
import { StockSymbolDto } from '@app/modules/stock/dtos/stock-symbol.dto';
import { UpdateMonitoringDto } from '@app/modules/stock/dtos/update-monitoring.dto';
import { IStockDataProvider } from '@app/modules/stock/interfaces/stock-data-provider.interface';
import { MonitoringService } from '@app/modules/stock/monitoring.service';
import { StockService } from '@app/modules/stock/stock.service';
import { Body, Controller, Get, Inject, Logger, Param, Post, Put } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

@ApiTags('Stock')
@Controller('stock')
export class StockController {
  private readonly logger = new Logger(StockController.name);

  constructor(
    @Inject(STOCK_DATA_PROVIDER_TOKEN)
    private readonly stockDataProvider: IStockDataProvider,
    private readonly stockService: StockService,
    private readonly monitoringService: MonitoringService,
  ) {}

  @Get(':symbol')
  @ApiOperation({
    summary: 'Get stock data',
    description:
      'Retrieve current stock price, last updated time, 10-period moving average, and monitoring status for a symbol',
  })
  @ApiParam({
    name: 'symbol',
    description: 'Stock symbol to retrieve data for',
    example: 'AAPL',
  })
  @ApiResponse({
    status: 200,
    description: 'Stock data retrieved successfully',
    type: StockDataDto,
  })
  @ApiResponse({
    status: 404,
    description: 'No data found for symbol',
    type: ErrorResponseDto,
  })
  async getStockData(@Param() symbolDto: StockSymbolDto): Promise<StockDataDto> {
    try {
      this.logger.log(`Stock data request for symbol: ${symbolDto.symbol}`, {
        symbol: symbolDto.symbol,
      });

      const stockData = await this.stockService.getStockData(symbolDto.symbol);

      this.logger.log(`Successfully retrieved stock data for ${symbolDto.symbol}`, {
        symbol: symbolDto.symbol,
        currentPrice: stockData.currentPrice,
        lastUpdated: stockData.lastUpdated,
        movingAverage: stockData.movingAverage,
        monitoringStatus: stockData.monitoringStatus,
        lastFetch: stockData.lastFetch,
      });

      return stockData;
    } catch (error) {
      this.logger.error(`Failed to retrieve stock data for ${symbolDto.symbol}`, {
        symbol: symbolDto.symbol,
        error: error instanceof Error ? error.message : String(error),
      });

      // Re-throw the error to be handled by global exception filter
      throw error;
    }
  }

  @Post(':symbol/fetch')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute for manual fetching
  @ApiOperation({
    summary: 'Manually fetch stock price',
    description:
      'Fetches current stock price from external API and saves to database. Subject to rate limiting (10 requests/minute). Rate limit headers are included in response: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset.',
  })
  @ApiParam({
    name: 'symbol',
    description: 'Stock symbol to fetch',
    example: 'AAPL',
  })
  @ApiResponse({
    status: 200,
    description: 'Stock price fetched and saved successfully',
    type: StockDataDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Invalid stock symbol',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 429,
    description: 'Rate limit exceeded',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 502,
    description: 'Upstream API error',
    type: ErrorResponseDto,
  })
  async fetchStockPrice(@Param() symbolDto: StockSymbolDto): Promise<CreateStockPriceDto> {
    try {
      this.logger.log(`Manual fetch requested for symbol: ${symbolDto.symbol}`, {
        symbol: symbolDto.symbol,
      });

      const quoteData = await this.stockDataProvider.getQuote(symbolDto.symbol);

      const createPriceDto: CreateStockPriceDto = {
        symbol: symbolDto.symbol.toUpperCase(),
        price: quoteData.currentPrice.toString(),
        timestamp: new Date(),
      };

      const savedPrice = await this.stockService.saveStockPrice(createPriceDto);

      this.logger.log(`Successfully fetched and saved price for ${symbolDto.symbol}`, {
        symbol: symbolDto.symbol,
        price: savedPrice.price,
        timestamp: savedPrice.timestamp.toISOString(),
      });

      return {
        symbol: savedPrice.symbol,
        price: savedPrice.price,
        timestamp: savedPrice.timestamp,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch stock price for ${symbolDto.symbol}`, {
        symbol: symbolDto.symbol,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }

  @Put(':symbol')
  @ApiOperation({
    summary: 'Update stock monitoring',
    description: 'Updates monitoring configuration for a stock symbol. Can activate/deactivate monitoring.',
  })
  @ApiParam({
    name: 'symbol',
    description: 'Stock symbol to update monitoring for',
    example: 'AAPL',
  })
  @ApiBody({
    type: UpdateMonitoringDto,
    description: 'Monitoring configuration to update',
  })
  @ApiResponse({
    status: 200,
    description: 'Monitoring updated successfully',
    type: MonitoringResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid symbol or symbol not found in external API',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 502,
    description: 'External API error',
    type: ErrorResponseDto,
  })
  async updateMonitoring(
    @Param() symbolDto: StockSymbolDto,
    @Body() updateDto: UpdateMonitoringDto,
  ): Promise<MonitoringResponseDto> {
    try {
      this.logger.log(`Monitoring update request for symbol: ${symbolDto.symbol}`, {
        symbol: symbolDto.symbol,
        isActive: updateDto.isActive,
      });

      let monitoringConfig: MonitoringResponseDto;

      if (updateDto.isActive) {
        monitoringConfig = await this.monitoringService.enableMonitoring(symbolDto.symbol);
      } else {
        await this.monitoringService.deactivateMonitoring(symbolDto.symbol);

        const config = await this.monitoringService.getMonitoringConfiguration(symbolDto.symbol);
        if (!config) {
          throw new Error('Failed to retrieve monitoring configuration after deactivation');
        }
        monitoringConfig = {
          symbol: config.symbol,
          isActive: config.isActive,
          lastFetch: config.lastFetch,
        };
      }

      this.logger.log(`Successfully updated monitoring for ${symbolDto.symbol}`, {
        symbol: symbolDto.symbol,
        isActive: monitoringConfig.isActive,
      });

      return monitoringConfig;
    } catch (error) {
      this.logger.error(`Failed to update monitoring for ${symbolDto.symbol}`, {
        symbol: symbolDto.symbol,
        isActive: updateDto.isActive,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }
}
