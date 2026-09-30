import { BadRequestException, Controller, Get, Query, Res } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Response } from 'express';

import { EntsoeService } from './entsoe.service';

const ENTSOE_TIMESTAMP_PATTERN = /^\d{12}$/;

@ApiTags('ENTSO-E')
@Controller('entsoe')
export class EntsoeController {
  constructor(private readonly entsoeService: EntsoeService) {}

  @Get('day-ahead-prices')
  @ApiOperation({ summary: 'Fetch day-ahead prices from ENTSO-E' })
  @ApiQuery({
    name: 'periodStart',
    required: true,
    description: 'Inclusive interval start in YYYYMMDDHHmm format.',
    schema: { type: 'string', pattern: '^\\d{12}$', example: '202609270000' },
  })
  @ApiQuery({
    name: 'periodEnd',
    required: true,
    description: 'Exclusive interval end in YYYYMMDDHHmm format.',
    schema: { type: 'string', pattern: '^\\d{12}$', example: '202609280000' },
  })
  @ApiProduces('application/xml')
  @ApiOkResponse({
    description: 'The ENTSO-E day-ahead price document.',
    content: {
      'application/xml': {
        schema: { type: 'string' },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'The timestamps are missing, malformed, or do not form an increasing interval.',
  })
  async getDayAheadPrices(
    @Query('periodStart') periodStart: string | undefined,
    @Query('periodEnd') periodEnd: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<string> {
    if (
      !periodStart ||
      !periodEnd ||
      !ENTSOE_TIMESTAMP_PATTERN.test(periodStart) ||
      !ENTSOE_TIMESTAMP_PATTERN.test(periodEnd) ||
      periodStart >= periodEnd
    ) {
      throw new BadRequestException(
        'periodStart and periodEnd must use YYYYMMDDHHmm and form an increasing interval.',
      );
    }

    const xml = await this.entsoeService.getDayAheadPrices({
      periodStart,
      periodEnd,
    });
    response.type('application/xml');

    return xml;
  }
}
