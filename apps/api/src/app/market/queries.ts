import { BadRequestException } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsISO8601, IsIn, IsNumber, IsOptional, Matches, Min } from 'class-validator';

import { QUARTER_MS } from '@power-market-dashboard/market';

export class RangeQuery {
  @ApiProperty({
    example: '2026-09-27T00:00:00Z',
    description: 'Inclusive ISO timestamp with timezone.',
  })
  @IsISO8601({ strict: true })
  @Matches(/(?:Z|[+-]\d{2}:\d{2})$/)
  from!: string;
  @ApiProperty({
    example: '2026-09-28T00:00:00Z',
    description: 'Exclusive ISO timestamp with timezone.',
  })
  @IsISO8601({ strict: true })
  @Matches(/(?:Z|[+-]\d{2}:\d{2})$/)
  to!: string;
}
export class LadderQuery {
  @ApiProperty({
    example: '2026-09-27T00:00:00Z',
    description: 'Start of the delivery quarter, with timezone.',
  })
  @IsISO8601({ strict: true })
  @Matches(/(?:Z|[+-]\d{2}:\d{2})$/)
  at!: string;
  @ApiProperty({ enum: ['afrr', 'mfrr'] })
  @IsIn(['afrr', 'mfrr'])
  product!: 'afrr' | 'mfrr';
  @ApiProperty({ enum: ['up', 'down'] })
  @IsIn(['up', 'down'])
  direction!: 'up' | 'down';
  @ApiProperty({
    example: 'A04',
    description: 'Source market product code; discover in /data-status groups.',
  })
  @Matches(/^[A-Za-z0-9-]{1,32}$/)
  productType!: string;
  @ApiProperty({ example: 'HUF' })
  @Matches(/^[A-Z]{3}$/)
  currency!: string;
  @ApiPropertyOptional({
    minimum: 0.000001,
    description: 'Positive cumulative MW.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowInfinity: false, allowNaN: false })
  @Min(0.000001)
  targetMw?: number;
}
export class PriceHistoryQuery extends RangeQuery {
  @ApiProperty({ enum: ['afrr', 'mfrr'] })
  @IsIn(['afrr', 'mfrr'])
  product!: 'afrr' | 'mfrr';
  @ApiProperty({ enum: ['up', 'down'] })
  @IsIn(['up', 'down'])
  direction!: 'up' | 'down';
  @ApiProperty({ example: 'A04' })
  @Matches(/^[A-Za-z0-9-]{1,32}$/)
  productType!: string;
  @ApiProperty({ example: 'HUF' })
  @Matches(/^[A-Z]{3}$/)
  currency!: string;
  @ApiProperty({ minimum: 0.000001 })
  @Type(() => Number)
  @IsNumber({ allowInfinity: false, allowNaN: false })
  @Min(0.000001)
  targetMw!: number;
}
export function validateRange(query: RangeQuery, maxDays: number) {
  const start = Date.parse(query.from),
    end = Date.parse(query.to);
  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    end <= start ||
    end - start > maxDays * 86400000
  )
    throw new BadRequestException(`Range must be increasing and at most ${maxDays} days`);
  if (start % QUARTER_MS || end % QUARTER_MS)
    throw new BadRequestException('Times must align to delivery quarters');
}
