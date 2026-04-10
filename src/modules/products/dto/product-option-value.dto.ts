import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class ProductOptionValueDto {
  @ApiProperty({ example: 12 })
  @IsInt()
  optionValueId!: number;

  @ApiProperty({ example: 'Blue' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 20 })
  @IsInt()
  @Min(0)
  quantity!: number;

  @ApiPropertyOptional({ example: 2.5 })
  @IsOptional()
  priceModifier?: number;
}
