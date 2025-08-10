import { IsPositiveDecimalConstraint } from '@app/modules/stock/entities/stock-price.entity';
import { Type } from 'class-transformer';
import { IsDateString, IsNotEmpty, Matches, Validate } from 'class-validator';

export class CreateStockPriceDto {
  @IsNotEmpty()
  @Matches(/^[A-Z]{1,10}$/, {
    message: 'Symbol must be 1-10 uppercase letters',
  })
  symbol!: string;

  @IsNotEmpty()
  @Validate(IsPositiveDecimalConstraint)
  price!: string;

  @IsNotEmpty()
  @IsDateString()
  @Type(() => Date)
  timestamp!: Date;
}
