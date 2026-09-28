import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { Dataset } from '@power-market-dashboard/market';
import { MarketSnapshotEntity } from './market-snapshot.entity';

@Entity('market_windows')
@Index('market_windows_range', ['dataset', 'from', 'to'])
export class MarketWindowEntity {
  @PrimaryColumn({ name: 'dataset', type: 'text' })
  dataset!: Dataset;

  @PrimaryColumn({ name: 'from', type: 'timestamptz' })
  from!: Date;

  @PrimaryColumn({ name: 'to', type: 'timestamptz' })
  to!: Date;

  @Column({ name: 'snapshot_id', type: 'bigint', nullable: true })
  snapshotId!: string | null;

  @Column({ name: 'checked_at', type: 'timestamptz', default: () => 'now()' })
  checkedAt!: Date;

  @Column({ name: 'last_success_at', type: 'timestamptz', nullable: true })
  lastSuccessAt!: Date | null;

  @Column({ name: 'error', type: 'text', nullable: true })
  error!: string | null;

  @Column({ name: 'no_data', type: 'boolean', default: false })
  noData!: boolean;

  @ManyToOne(() => MarketSnapshotEntity, {
    nullable: true,
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  @JoinColumn({
    name: 'snapshot_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'market_windows_snapshot_id_fkey',
  })
  snapshot!: MarketSnapshotEntity | null;
}
