import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional } from 'class-validator';

export class AdjustStockDto {
  @ApiProperty({ example: 25 })
  @IsInt()
  quantity!: number;

  @ApiPropertyOptional({ example: 41 })
  @IsOptional()
  @IsInt()
  optionValueId?: number;
}
