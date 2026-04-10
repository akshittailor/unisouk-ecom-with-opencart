import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { OpenCartClientService } from './opencart.service';

@ApiTags('OpenCart Integration')
@Controller('opencart')
export class OpenCartController {
  constructor(private readonly openCartClientService: OpenCartClientService) {}
}
