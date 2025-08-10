import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExternalModule } from '../external/external.module';
import { FinnhubAdapterService } from '../external/finnhub/finnhub-adapter.service';
import { STOCK_DATA_PROVIDER_TOKEN } from './constants/stock-provider.constants';
import { StockPrice } from './entities/stock-price.entity';
import { StockMonitoring } from './entities/stock-monitoring.entity';
import { MonitoringService } from './monitoring.service';
import { ScheduledTasksService } from './scheduled-tasks.service';
import { StockController } from './stock.controller';
import { StockService } from './stock.service';

@Module({
  imports: [TypeOrmModule.forFeature([StockPrice, StockMonitoring]), ExternalModule],
  controllers: [StockController],
  providers: [
    StockService,
    MonitoringService,
    ScheduledTasksService,
    {
      provide: STOCK_DATA_PROVIDER_TOKEN,
      useClass: FinnhubAdapterService,
    },
  ],
  exports: [StockService, STOCK_DATA_PROVIDER_TOKEN],
})
export class StockModule {}
