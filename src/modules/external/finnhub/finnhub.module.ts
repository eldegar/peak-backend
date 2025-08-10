import { FinnhubAdapterService } from '@app/modules/external/finnhub/finnhub-adapter.service';
import { FinnhubService } from '@app/modules/external/finnhub/finnhub.service';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
@Module({
  imports: [ConfigModule],
  providers: [FinnhubService, FinnhubAdapterService],
  exports: [FinnhubService, FinnhubAdapterService],
})
export class FinnhubModule {}
