import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateMonitoringDto {
  @ApiProperty({
    description: 'Enable or disable monitoring for the symbol',
    example: true,
  })
  @IsBoolean()
  isActive!: boolean;
}
