import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ProductOptionDto } from './product-option.dto';

export class CreateProductDto {
  @ApiProperty({ example: 'Premium T-Shirt' })
  @IsString()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({ example: 'TSHIRT-001' })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiProperty({ example: 19.99 })
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiProperty({ example: 50 })
  @IsInt()
  @Min(0)
  quantity!: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  status?: number;

  @ApiPropertyOptional({ type: [ProductOptionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductOptionDto)
  options?: ProductOptionDto[];
}
