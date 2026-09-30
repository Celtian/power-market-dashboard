import { isPlatformBrowser } from '@angular/common';
import { DestroyRef, PLATFORM_ID, Service, inject, signal } from '@angular/core';

import { Subject, interval, map, merge } from 'rxjs';

import type { Dataset } from './market-data.models';

export type LiveConnectionState = 'idle' | 'connecting' | 'connected' | 'offline';

export interface MarketChange {
  id: string;
  dataset: Dataset;
  from: string;
  to: string;
  recordedAt: string;
}

export type MarketRefresh =
  { type: 'ready' | 'poll' } | { type: 'market-change'; change: MarketChange };

@Service()
export class MarketLiveService {
  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly messages = new Subject<MarketRefresh>();
  private readonly state = signal<LiveConnectionState>('idle');
  private source?: EventSource;
  private started = false;

  public readonly connectionState = this.state.asReadonly();
  public readonly refreshes$ = merge(
    this.messages.asObservable(),
    interval(30_000).pipe(map(() => ({ type: 'poll' as const }))),
  );

  public start(): void {
    if (!this.isBrowser || this.started) return;
    if (typeof EventSource === 'undefined') {
      this.state.set('offline');
      return;
    }
    this.started = true;
    this.state.set('connecting');
    this.source = new EventSource('/api/events');
    this.source.onopen = () => this.state.set('connected');
    this.source.onerror = () => this.state.set('offline');
    this.source.addEventListener('ready', () => {
      this.state.set('connected');
      this.messages.next({ type: 'ready' });
    });
    this.source.addEventListener('heartbeat', () => this.state.set('connected'));
    this.source.addEventListener('market-change', (event) => {
      try {
        const change = JSON.parse((event as MessageEvent<string>).data) as MarketChange;
        this.messages.next({ type: 'market-change', change });
      } catch {
        this.state.set('offline');
      }
    });
    this.source.addEventListener('unavailable', () => this.state.set('offline'));
    this.destroyRef.onDestroy(() => this.source?.close());
  }
}
