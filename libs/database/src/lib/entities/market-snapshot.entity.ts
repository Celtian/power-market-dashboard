import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

import { Dataset } from '@power-market-dashboard/market';

@Entity('market_snapshots')
export class MarketSnapshotEntity {
  @PrimaryGeneratedColumn({ name: 'id', type: 'bigint' })
  id!: string;

  @Column({ name: 'dataset', type: 'text' })
  dataset!: Dataset;

  @Column({ name: 'from', type: 'timestamptz' })
  from!: Date;

  @Column({ name: 'to', type: 'timestamptz' })
  to!: Date;

  @Column({ name: 'content_hash', type: 'text' })
  contentHash!: string;

  @Column({ name: 'fetched_at', type: 'timestamptz' })
  fetchedAt!: Date;

  @Column({ name: 'stored_at', type: 'timestamptz', default: () => 'now()' })
  storedAt!: Date;

  @Column({ name: 'source_created_at', type: 'timestamptz', nullable: true })
  sourceCreatedAt!: Date | null;

  @Column({ name: 'revision', type: 'integer' })
  revision!: number;

  @Column({ name: 'no_data', type: 'boolean' })
  noData!: boolean;
}
