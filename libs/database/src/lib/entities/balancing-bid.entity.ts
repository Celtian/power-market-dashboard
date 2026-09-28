import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Direction } from '@power-market-dashboard/market';
import { numericTransformer } from './numeric.transformer';
import { MarketSnapshotEntity } from './market-snapshot.entity';

@Entity('balancing_bids')
export class BalancingBidEntity {
  @PrimaryColumn({ name: 'snapshot_id', type: 'bigint' })
  snapshotId!: string;

  @PrimaryColumn({ name: 'start_at', type: 'timestamptz' })
  startAt!: Date;

  @PrimaryColumn({ name: 'end_at', type: 'timestamptz' })
  endAt!: Date;

  @PrimaryColumn({ name: 'bid_id', type: 'text' })
  bidId!: string;

  @Column({ name: 'direction', type: 'text' })
  direction!: Direction;

  @Column({ name: 'product_type', type: 'text' })
  productType!: string;

  @Column({ name: 'currency', type: 'text', nullable: true })
  currency!: string | null;

  @Column({ name: 'mw', type: 'numeric', transformer: numericTransformer })
  mw!: number;

  @Column({
    name: 'price',
    type: 'numeric',
    nullable: true,
    transformer: numericTransformer,
  })
  price!: number | null;

  @Column({ name: 'available', type: 'boolean', nullable: true })
  available!: boolean | null;

  @Column({ name: 'cancelled', type: 'boolean' })
  cancelled!: boolean;

  @Column({ name: 'divisible', type: 'boolean', nullable: true })
  divisible!: boolean | null;

  @Column({ name: 'complexity', type: 'text', nullable: true })
  complexity!: string | null;

  @Column({ name: 'validity_start', type: 'timestamptz', nullable: true })
  validityStart!: Date | null;

  @Column({ name: 'validity_end', type: 'timestamptz', nullable: true })
  validityEnd!: Date | null;

  @Column({ name: 'resolution_seconds', type: 'integer' })
  resolutionSeconds!: number;

  @Column({ name: 'revision', type: 'integer' })
  revision!: number;

  @ManyToOne(() => MarketSnapshotEntity, {
    nullable: false,
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  @JoinColumn({
    name: 'snapshot_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'balancing_bids_snapshot_id_fkey',
  })
  snapshot!: MarketSnapshotEntity;
}
