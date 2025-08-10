import { STOCK_DATA_PROVIDER_TOKEN } from '@app/modules/stock/constants/stock-provider.constants';
import { MonitoringResponseDto } from '@app/modules/stock/dtos/monitoring-response.dto';
import { StockMonitoring } from '@app/modules/stock/entities/stock-monitoring.entity';
import { IStockDataProvider } from '@app/modules/stock/interfaces/stock-data-provider.interface';
import { BadRequestException, ConflictException, Inject, Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, QueryFailedError, Repository } from 'typeorm';

@Injectable()
export class MonitoringService extends Repository<StockMonitoring> {
  private readonly logger = new Logger(MonitoringService.name);

  constructor(
    @InjectDataSource() dataSource: DataSource,
    @Inject(STOCK_DATA_PROVIDER_TOKEN)
    private readonly stockDataProvider: IStockDataProvider,
  ) {
    super(StockMonitoring, dataSource.createEntityManager());
  }

  async enableMonitoring(symbol: string): Promise<MonitoringResponseDto> {
    const symbolUpper = symbol.toUpperCase();

    this.logger.log(`Enabling monitoring for symbol: ${symbolUpper}`, {
      symbol: symbolUpper,
    });

    // Create or update monitoring configuration with constraint handling
    try {
      const monitoring = await this.createOrUpdateMonitoring(symbolUpper);

      this.logger.log(`Successfully enabled monitoring for ${symbolUpper}`, {
        symbol: symbolUpper,
        id: monitoring.id,
        isActive: monitoring.isActive,
      });

      return this.mapToResponseDto(monitoring);
    } catch (error) {
      if (error instanceof QueryFailedError && error.message.includes('duplicate key')) {
        throw new ConflictException(`Monitoring configuration already exists for symbol '${symbolUpper}'`);
      }
      throw error;
    }
  }

  async getMonitoredSymbols(): Promise<StockMonitoring[]> {
    this.logger.debug('Getting all monitored symbols');

    return await this.getActiveMonitoringConfigs();
  }

  async updateMonitoringStatus(symbol: string, isActive: boolean, lastFetch?: Date): Promise<StockMonitoring> {
    const symbolUpper = symbol.toUpperCase();

    this.logger.log(`Updating monitoring status for symbol: ${symbolUpper}`, {
      symbol: symbolUpper,
      isActive,
    });

    const existing = await this.findBySymbol(symbolUpper);

    if (!existing) {
      throw new BadRequestException(`No monitoring configuration found for symbol '${symbolUpper}'`);
    }

    existing.isActive = isActive;

    if (lastFetch) {
      existing.lastFetch = lastFetch;
    }

    try {
      const updated = await this.save(existing);

      this.logger.log(`Successfully updated monitoring status for ${symbolUpper}`, {
        symbol: symbolUpper,
        id: updated.id,
        isActive: updated.isActive,
      });

      return updated;
    } catch (error) {
      this.logger.error(`Failed to update monitoring status for ${symbolUpper}`, {
        symbol: symbolUpper,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new BadRequestException(`Failed to update monitoring status for symbol '${symbolUpper}'`);
    }
  }

  async deactivateMonitoring(symbol: string): Promise<void> {
    const symbolUpper = symbol.toUpperCase();

    await this.updateMonitoringStatus(symbolUpper, false);

    this.logger.log(`Deactivated monitoring for ${symbolUpper}`, {
      symbol: symbolUpper,
    });
  }

  async getMonitoringConfiguration(symbol: string): Promise<StockMonitoring | null> {
    const symbolUpper = symbol.toUpperCase();

    return await this.findBySymbol(symbolUpper);
  }

  private mapToResponseDto(monitoring: StockMonitoring): MonitoringResponseDto {
    return {
      symbol: monitoring.symbol,
      isActive: monitoring.isActive,
      lastFetch: monitoring.lastFetch,
    };
  }

  async findBySymbol(symbol: string): Promise<StockMonitoring | null> {
    return this.findOne({
      where: { symbol: symbol.toUpperCase() },
    });
  }

  async createOrUpdateMonitoring(symbol: string): Promise<StockMonitoring> {
    const symbolUpper = symbol.toUpperCase();
    await this.stockDataProvider.getQuote(symbolUpper);
    const existingMonitoring = await this.findBySymbol(symbolUpper);

    if (existingMonitoring) {
      existingMonitoring.isActive = true;

      const updated = await this.save(existingMonitoring);
      return updated;
    } else {
      // Create new monitoring configuration
      const newMonitoring = this.create({
        symbol: symbolUpper,
        isActive: true,
        lastFetch: undefined,
      });

      const saved = await this.save(newMonitoring);
      this.logger.debug(`Created new monitoring configuration for ${symbolUpper}`, {
        id: saved.id,
      });

      return saved;
    }
  }

  async getActiveMonitoringConfigs(): Promise<StockMonitoring[]> {
    this.logger.debug('Retrieving all active monitoring configurations');

    return this.find({
      where: { isActive: true },
      order: { createdAt: 'ASC' },
    });
  }
}
