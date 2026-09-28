import { Injectable } from '@nestjs/common';
import axios from 'axios';
import {
  Dataset,
  HU_DOMAIN,
  ImportRequest,
  ImportResult,
  ParsedPage,
  SourceRejection,
  entsoeTime,
  parseResponse,
} from '@power-market-dashboard/market';
import { EntsoeConfig } from '../entsoe/entsoe.config';

export class ImportFailure extends Error {
  constructor(
    message: string,
    readonly retryable = true,
    readonly retryAfterMs = 0,
  ) {
    super(message);
  }
}
function retryAfter(value: unknown): number {
  if (typeof value !== 'string') return 0;
  const seconds = Number(value);
  return (
    Math.max(
      0,
      Number.isFinite(seconds)
        ? seconds * 1000
        : Date.parse(value) - Date.now(),
    ) || 0
  );
}
@Injectable()
export class SourceClient {
  private pending: { priority: string; run: () => void }[] = [];
  private pumping = false;
  private nextRequestAt = 0;
  private blockedUntil = 0;
  constructor(private readonly config: EntsoeConfig) {}
  private async permit(priority: string): Promise<void> {
    await new Promise<void>((resolve) => {
      this.pending.push({ priority, run: resolve });
      if (!this.pumping) void this.pump();
    });
  }
  private async pump() {
    this.pumping = true;
    while (this.pending.length) {
      await new Promise((resolve) =>
        setTimeout(
          resolve,
          Math.max(
            0,
            this.nextRequestAt - Date.now(),
            this.blockedUntil - Date.now(),
          ),
        ),
      );
      // A 429 can extend the shared cooldown while this timer is pending.
      if (Date.now() < this.blockedUntil) continue;
      const live = this.pending.findIndex((item) => item.priority === 'live');
      const [item] = this.pending.splice(live < 0 ? 0 : live, 1);
      this.nextRequestAt = Date.now() + 350;
      item.run();
    }
    this.pumping = false;
  }
  async fetch(request: ImportRequest): Promise<ImportResult> {
    const started = Date.now();
    const result: ImportResult = {
      documents: [],
      generation: [],
      bids: [],
      noData: false,
      seriesCount: 0,
      fetchedAt: new Date().toISOString(),
      fetchMs: 0,
    };
    const bid = !request.dataset.startsWith('solar');
    const fingerprints = new Set<string>();
    for (let offset = 0; offset <= 4800; offset += 100) {
      await this.permit(request.priority);
      const params: Record<string, string | number> = {
        securityToken: this.config.securityToken,
        periodStart: entsoeTime(request.from),
        periodEnd: entsoeTime(request.to),
        ...this.parameters(request.dataset),
      };
      if (bid) params['offset'] = offset;
      let page: ParsedPage;
      try {
        const response = await axios.get<ArrayBuffer>(this.config.apiUrl, {
          params,
          responseType: 'arraybuffer',
          timeout: this.config.timeoutMs,
          maxContentLength: 20 * 1024 * 1024,
          maxRedirects: 0,
          validateStatus: (status) => status === 200 || status === 400,
        });
        page = parseResponse(new Uint8Array(response.data), request.dataset);
      } catch (error) {
        if (axios.isAxiosError(error)) {
          const status = error.response?.status;
          const delay = retryAfter(error.response?.headers['retry-after']);
          if (status === 429)
            this.blockedUntil = Math.max(
              this.blockedUntil,
              Date.now() + Math.max(delay, 60_000),
            );
          throw new ImportFailure(
            `Source HTTP ${status ?? 'unavailable'}`,
            !status || status === 429 || status >= 500,
            delay,
          );
        }
        if (error instanceof SourceRejection)
          throw new ImportFailure(error.message, false);
        throw new ImportFailure('Invalid source response', false);
      }
      const fingerprint = JSON.stringify(page.bids);
      if (bid && page.seriesCount > 0 && fingerprints.has(fingerprint))
        throw new ImportFailure('Repeated source page', false);
      fingerprints.add(fingerprint);
      result.documents.push(
        ...page.documents.map((document) => ({
          ...document,
          observedAt: new Date().toISOString(),
        })),
      );
      result.generation.push(...page.generation);
      result.bids.push(...page.bids);
      result.seriesCount += page.seriesCount;
      result.noData = result.seriesCount === 0 && page.noData;
      if (!bid || page.seriesCount < 100) {
        result.fetchMs = Date.now() - started;
        result.fetchedAt = new Date().toISOString();
        return result;
      }
    }
    throw new ImportFailure(
      'Source pagination limit exceeded; snapshot not published',
      false,
    );
  }
  private parameters(dataset: Dataset): Record<string, string> {
    switch (dataset) {
      case 'solar-actual':
        return {
          documentType: 'A75',
          processType: 'A16',
          psrType: 'B16',
          in_Domain: HU_DOMAIN,
        };
      case 'solar-forecast':
        return {
          documentType: 'A69',
          processType: 'A01',
          psrType: 'B16',
          in_Domain: HU_DOMAIN,
        };
      case 'afrr':
      case 'mfrr':
        return {
          documentType: 'A37',
          businessType: 'B74',
          processType: dataset === 'afrr' ? 'A51' : 'A47',
          connecting_Domain: HU_DOMAIN,
        };
    }
  }
}
