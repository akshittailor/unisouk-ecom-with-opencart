import { Controller,Post, Get, Param, ParseIntPipe, Patch, Body, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { ListOrdersQueryDto } from './dto/list-orders-query.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { CreateOrderDto } from './dto/create-order.dto';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('create')
  @ApiOperation({ summary: 'Create order in OpenCart' })
  @UsePipes(new ValidationPipe({ whitelist: false, transform: true }))
  create(@Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.createOrder(createOrderDto);
  }

  @Get()
  @ApiOperation({ summary: 'List orders with optional status and date range filters' })
  findAll(@Query() query: ListOrdersQueryDto) {
    return this.ordersService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get full order details including line items' })
  findOne(@Param('id', ParseIntPipe) orderId: number) {
    return this.ordersService.findOne(orderId);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update order status and trigger async inventory sync when applicable' })
  updateStatus(
    @Param('id', ParseIntPipe) orderId: number,
    @Body() updateOrderStatusDto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(
      orderId,
      updateOrderStatusDto.status,
      updateOrderStatusDto.triggerInventorySync ?? true,
    );
  }
}
