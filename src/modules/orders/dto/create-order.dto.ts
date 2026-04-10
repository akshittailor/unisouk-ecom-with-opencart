import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class CustomerDto {
  @ApiProperty({ example: 'John' })
  @IsString()
  firstname!: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  lastname!: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '+1-555-123-4567' })
  @IsString()
  telephone!: string;
}

export class AddressDto {
  @ApiProperty({ example: 'John' })
  @IsString()
  firstname!: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  lastname!: string;

  @ApiProperty({ example: '221B Baker Street' })
  @IsString()
  address1!: string;

  @ApiProperty({ example: 'London' })
  @IsString()
  city!: string;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  zoneId!: number;

  @ApiProperty({ example: 222 })
  @Type(() => Number)
  @IsInt()
  countryId!: number;
}

export class OrderProductDto {
  @ApiProperty({ example: 42 })
  @Type(() => Number)
  @IsInt()
  productId!: number;

  @ApiProperty({ example: 2, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiProperty({
    example: [41, 43],
    required: false,
    description: 'Selected option value IDs for variant/option-based products',
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  optionValueIds?: number[];
}

export class CreateOrderDto {
  @ApiProperty({ type: () => CustomerDto })
  @ValidateNested()
  @Type(() => CustomerDto)
  customer!: CustomerDto;

  @ApiProperty({ type: () => AddressDto })
  @ValidateNested()
  @Type(() => AddressDto)
  paymentAddress!: AddressDto;

  @ApiProperty({ type: () => AddressDto })
  @ValidateNested()
  @Type(() => AddressDto)
  shippingAddress!: AddressDto;

  @ApiProperty({ type: () => [OrderProductDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderProductDto)
  products!: OrderProductDto[];

  @ApiProperty({ example: 'Flat Shipping Rate' })
  @IsString()
  shippingMethod!: string;

  @ApiProperty({ example: 'Cash On Delivery' })
  @IsString()
  paymentMethod!: string;
}