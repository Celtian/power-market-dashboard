import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { AppService } from './app.service';

@ApiTags('Importer')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Importer service status' })
  @ApiOkResponse({
    description: 'The importer HTTP service is running.',
    schema: {
      type: 'object',
      required: ['message'],
      properties: {
        message: { type: 'string', example: 'Hello API' },
      },
    },
  })
  getData() {
    return this.appService.getData();
  }
}
