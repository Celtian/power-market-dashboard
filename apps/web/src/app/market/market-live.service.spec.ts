import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { MarketLiveService } from './market-live.service';

describe('MarketLiveService', () => {
  it('does not create EventSource during server rendering', () => {
    TestBed.configureTestingModule({
      providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
    });
    const service = TestBed.inject(MarketLiveService);

    service.start();

    expect(service.connectionState()).toBe('idle');
  });
});
