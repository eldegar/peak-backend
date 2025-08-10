import { FinnhubModule } from '@app/modules/external/finnhub/finnhub.module';
import { Module } from '@nestjs/common';

@Module({
  imports: [FinnhubModule],
  exports: [FinnhubModule],
})
export class ExternalModule {}
