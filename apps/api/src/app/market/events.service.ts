import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Injectable, MessageEvent } from '@nestjs/common';
import {
  Observable,
  catchError,
  concatMap,
  defer,
  exhaustMap,
  of,
  timer,
} from 'rxjs';

@Injectable()
export class EventsService {
  constructor(@InjectDataSource() private readonly db: DataSource) {}
  stream(lastId?: string): Observable<MessageEvent> {
    return defer(() => {
      let cursor = lastId;
      return timer(0, 1000).pipe(
        exhaustMap(async (tick) => {
          if (cursor === undefined) {
            const result = await this.db.query<{ id: string }[]>(
              'SELECT COALESCE(max(id),0)::text AS id FROM market_changes',
            );
            cursor = result[0].id;
            // Client opens SSE before requesting its initial REST snapshot.
            return [{ id: cursor, type: 'ready', data: { refresh: true } }];
          }
          const result = await this.db.query<
            {
              id: string;
              dataset: string;
              from: Date;
              to: Date;
              recordedAt: Date;
            }[]
          >(
            'SELECT id::text,dataset,"from","to",recorded_at AS "recordedAt" FROM market_changes WHERE id>$1 ORDER BY id LIMIT 1000',
            [cursor],
          );
          if (result.length) {
            cursor = result[result.length - 1].id;
            return result.map((row) => ({
              id: row.id,
              type: 'market-change',
              data: row,
            }));
          }
          return tick % 15 === 0
            ? [{ type: 'heartbeat', data: { at: new Date().toISOString() } }]
            : [];
        }),
        concatMap((events) => events),
        catchError(() =>
          of({ type: 'unavailable', data: { reconnect: true } }),
        ),
      );
    });
  }
}
