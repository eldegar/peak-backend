import { IsNotEmpty, Matches, Validate, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';
import { Column, CreateDateColumn, Entity, UpdateDateColumn } from 'typeorm';

@ValidatorConstraint({ name: 'isPositiveDecimal', async: false })
export class IsPositiveDecimalConstraint implements ValidatorConstraintInterface {
  validate(value: string): boolean {
    const numValue = parseFloat(value);
    return !isNaN(numValue) && numValue > 0;
  }

  defaultMessage(): string {
    return 'Price must be a positive number';
  }
}

@Entity('stock_prices')
export class StockPrice {
  @Column({ primary: true, type: 'varchar', length: 10, nullable: false })
  @IsNotEmpty()
  @Matches(/^[A-Z]{1,10}$/, {
    message: 'Symbol must be 1-10 uppercase letters',
  })
  symbol!: string;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 6,
    nullable: false,
  })
  @IsNotEmpty()
  @Validate(IsPositiveDecimalConstraint)
  price!: string;

  @Column({
    type: 'timestamp with time zone',
    nullable: false,
    primary: true,
  })
  timestamp!: Date;

  @CreateDateColumn({
    type: 'timestamp with time zone',
    name: 'created_at',
  })
  createdAt!: Date;

  @UpdateDateColumn({
    type: 'timestamp with time zone',
    name: 'updated_at',
  })
  updatedAt!: Date;
}
