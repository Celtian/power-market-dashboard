import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

import { MarketSnapshotEntity } from './market-snapshot.entity';
import { numericTransformer } from './numeric.transformer';

@Entity('generation_intervals')
export class GenerationIntervalEntity {
  @PrimaryColumn({ name: 'snapshot_id', type: 'bigint' })
  snapshotId!: string;

  @PrimaryColumn({ name: 'start_at', type: 'timestamptz' })
  startAt!: Date;

  @PrimaryColumn({ name: 'end_at', type: 'timestamptz' })
  endAt!: Date;

  @PrimaryColumn({ name: 'series_id', type: 'text' })
  seriesId!: string;

  @Column({
    name: 'mw',
    type: 'numeric',
    nullable: true,
    transformer: numericTransformer,
  })
  mw!: number | null;

  @Column({ name: 'resolution_seconds', type: 'integer' })
  resolutionSeconds!: number;

  @Column({ name: 'revision', type: 'integer' })
  revision!: number;

  @Column({ name: 'cancelled', type: 'boolean' })
  cancelled!: boolean;

  @ManyToOne(() => MarketSnapshotEntity, {
    nullable: false,
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  @JoinColumn({
    name: 'snapshot_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'generation_intervals_snapshot_id_fkey',
  })
  snapshot!: MarketSnapshotEntity;
}
