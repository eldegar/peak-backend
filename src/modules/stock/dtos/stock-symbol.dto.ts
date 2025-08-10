import { IsString, Length, Matches } from 'class-validator';

export class StockSymbolDto {
  @IsString()
  @Length(1, 10, {
    message: 'Symbol must be between 1 and 10 characters long',
  })
  @Matches(/^[A-Z]{1,10}$/, {
    message: 'Symbol must contain only uppercase letters',
  })
  symbol!: string;
}
