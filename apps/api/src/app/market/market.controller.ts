import {
  solarSchema,
  ladderSchema,
  historySchema,
  statusSchema,
} from './schemas';
import {
  BadRequestException,
  Controller,
  Get,
  Headers,
  Query,
  Sse,
} from '@nestjs/common';
import {
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import { EventsService } from './events.service';
import { MarketService } from './market.service';
import { LadderQuery, PriceHistoryQuery, RangeQuery } from './queries';

@ApiTags('Hungarian market')
@Controller()
export class MarketController {
  constructor(
    private readonly market: MarketService,
    private readonly events: EventsService,
  ) {}
  @Get('solar')
  @ApiOperation({
    summary:
      'Day-ahead solar forecast, actual generation and deviations (max 31 days)',
  })
  @ApiOkResponse({
    schema: solarSchema,
    description:
      'Interval series in MW, duration-weighted MAE/RMSE, coverage and source metadata.',
  })
  solar(@Query() query: RangeQuery) {
    return this.market.solar(query);
  }
  @Get('balancing/ladder')
  @ApiOperation({ summary: 'Published-offer ladder for one delivery quarter' })
  @ApiOkResponse({
    schema: ladderSchema,
    description:
      'Cumulative MW steps, original currency/MWh, bid flags, completeness and snapshot metadata. targetPrice is null for incomplete or insufficient volume.',
  })
  ladder(@Query() query: LadderQuery) {
    return this.market.ladder(query);
  }
  @Get('balancing/price-history')
  @ApiOperation({
    summary:
      'Price at fixed cumulative MW across delivery quarters (max 7 days)',
  })
  @ApiOkResponse({
    schema: historySchema,
    description:
      'Quarterly prices with nulls for missing or insufficient offers, original currency and revision metadata.',
  })
  history(@Query() query: PriceHistoryQuery) {
    return this.market.history(query);
  }
  @Get('data-status')
  @ApiOkResponse({
    schema: statusSchema,
    description:
      'Dataset freshness, import timings and available product/direction/currency groups.',
  })
  status() {
    return this.market.status();
  }
  @Sse('events')
  @ApiProduces('text/event-stream')
  @ApiHeader({
    name: 'Last-Event-ID',
    required: false,
    description:
      'Durable change cursor; omit for ready event and initial REST refresh.',
  })
  eventsStream(@Headers('last-event-id') lastId?: string) {
    if (
      lastId !== undefined &&
      (!/^\d{1,19}$/.test(lastId) || BigInt(lastId) > 9223372036854775807n)
    )
      throw new BadRequestException('Invalid Last-Event-ID');
    return this.events.stream(lastId);
  }
}
