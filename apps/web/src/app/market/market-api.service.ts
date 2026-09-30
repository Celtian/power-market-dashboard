import { HttpClient, HttpParams } from '@angular/common/http';
import { Service, inject } from '@angular/core';

import {
  DataStatusResponse,
  LadderQuery,
  LadderResponse,
  PriceHistoryQuery,
  PriceHistoryResponse,
  SolarResponse,
} from './market-data.models';

@Service()
export class MarketApiService {
  private readonly http = inject(HttpClient);

  public solar(from: string, to: string) {
    return this.http.get<SolarResponse>('/api/solar', {
      params: new HttpParams().set('from', from).set('to', to),
    });
  }

  public ladder(query: LadderQuery) {
    return this.http.get<LadderResponse>('/api/balancing/ladder', {
      params: this.ladderParams(query),
    });
  }

  public priceHistory(query: PriceHistoryQuery) {
    return this.http.get<PriceHistoryResponse>('/api/balancing/price-history', {
      params: this.ladderParams(query).delete('at').set('from', query.from).set('to', query.to),
    });
  }

  public status() {
    return this.http.get<DataStatusResponse>('/api/data-status');
  }

  private ladderParams(query: LadderQuery | PriceHistoryQuery): HttpParams {
    let params = new HttpParams()
      .set('product', query.product)
      .set('direction', query.direction)
      .set('productType', query.productType)
      .set('currency', query.currency)
      .set('targetMw', query.targetMw);
    if ('at' in query) params = params.set('at', query.at);
    return params;
  }
}
