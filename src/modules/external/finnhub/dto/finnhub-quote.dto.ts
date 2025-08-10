import { IsNumber, IsPositive } from 'class-validator';

export class FinnhubQuoteDto {
  @IsNumber()
  @IsPositive()
  c!: number; // Current price

  @IsNumber()
  d!: number; // Change

  @IsNumber()
  dp!: number; // Percent change

  @IsNumber()
  @IsPositive()
  h!: number; // High price of the day

  @IsNumber()
  @IsPositive()
  l!: number; // Low price of the day

  @IsNumber()
  @IsPositive()
  o!: number; // Open price of the day

  @IsNumber()
  @IsPositive()
  pc!: number; // Previous close price

  @IsNumber()
  @IsPositive()
  t!: number; // Timestamp
}
