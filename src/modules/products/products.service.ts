import { Injectable } from '@nestjs/common';
import { OpenCartClientService } from '../../integrations/opencart/opencart.service';
import type { Product } from '../../integrations/opencart/interfaces';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly openCartClientService: OpenCartClientService) {}

  findAll(): Promise<Product[]> {
    return this.openCartClientService.listProducts();
  }

  findOne(productId: number): Promise<Product> {
    return this.openCartClientService.getProduct(productId);
  }

  create(createProductDto: CreateProductDto): Promise<Product> {
    return this.openCartClientService.createProduct(createProductDto as unknown as Record<string, unknown>);
  }

  update(productId: number, updateProductDto: UpdateProductDto): Promise<Product> {
    return this.openCartClientService.updateProduct(
      productId,
      updateProductDto as unknown as Record<string, unknown>,
    );
  }

  async remove(productId: number): Promise<{ deleted: boolean }> {
    await this.openCartClientService.deleteProduct(productId);
    return { deleted: true };
  }
}
