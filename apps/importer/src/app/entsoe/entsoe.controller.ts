import {
  BadRequestException,
  Controller,
  Get,
  Query,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { EntsoeService } from './entsoe.service';

const ENTSOE_TIMESTAMP_PATTERN = /^\d{12}$/;

@Controller('entsoe')
export class EntsoeController {
  constructor(private readonly entsoeService: EntsoeService) {}

  @Get('day-ahead-prices')
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
