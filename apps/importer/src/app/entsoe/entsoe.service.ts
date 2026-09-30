import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import axios, { isAxiosError } from 'axios';

import { EntsoeConfig } from './entsoe.config';

export interface DayAheadPriceQuery {
  periodStart: string;
  periodEnd: string;
}

@Injectable()
export class EntsoeService {
  private readonly logger = new Logger(EntsoeService.name);

  constructor(private readonly config: EntsoeConfig) {}

  async getDayAheadPrices(query: DayAheadPriceQuery): Promise<string> {
    try {
      const response = await axios.get<string>(this.config.apiUrl, {
        params: {
          securityToken: this.config.securityToken,
          documentType: 'A44',
          in_Domain: this.config.domain,
          out_Domain: this.config.domain,
          periodStart: query.periodStart,
          periodEnd: query.periodEnd,
        },
        headers: {
          Accept: 'application/xml',
        },
        responseType: 'text',
        timeout: this.config.timeoutMs,
      });

      return response.data;
    } catch (error: unknown) {
      const status = isAxiosError(error) ? error.response?.status : undefined;
      this.logger.error(`ENTSO-E request failed${status ? ` with status ${status}` : ''}`);
      throw new BadGatewayException('ENTSO-E request failed.');
    }
  }
}
