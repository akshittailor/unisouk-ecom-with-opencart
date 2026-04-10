import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsString, ValidateNested } from 'class-validator';
import { ProductOptionValueDto } from './product-option-value.dto';

export class ProductOptionDto {
  @ApiProperty({ example: 5 })
  @IsInt()
  optionId!: number;

  @ApiProperty({ example: 'Color' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ example: 'select' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiProperty({ type: [ProductOptionValueDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductOptionValueDto)
  values!: ProductOptionValueDto[];
}
