import { Body, Controller, Get, Param, ParseIntPipe, Patch, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { InventoryQueryDto } from './dto/inventory-query.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { LowStockQueryDto } from './dto/low-stock-query.dto';

@ApiTags('Inventory')
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) { }

  @Get()
  @ApiOperation({ summary: 'Get stocks for all or by id' })
  getStockLevels(@Query() query: InventoryQueryDto) {
    return this.inventoryService.getStockLevels(query.productId);
  }

  @Get('alerts/low-stock')
  @ApiOperation({ summary: 'Get low stock alerts based on configurable threshold' })
  getLowStockAlerts(@Query() query: LowStockQueryDto) {
    return this.inventoryService.getLowStockAlerts(query.threshold);
  }

  @Patch(':productId')
  @ApiOperation({ summary: 'Manually adjust stock quantity fo product or variant option value' })
  adjustStock(
    @Param('productId', ParseIntPipe) productId: number,
    @Body() adjustStockDto: AdjustStockDto,
  ) {
    return this.inventoryService.adjustStock(
      productId,
      adjustStockDto.quantity,
      adjustStockDto.optionValueId,
    );
  }
}
