import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { Dataset } from '@power-market-dashboard/market';

@Entity('market_changes')
export class MarketChangeEntity {
  @PrimaryGeneratedColumn({ name: 'id', type: 'bigint' })
  id!: string;

  @Column({ name: 'dataset', type: 'text' })
  dataset!: Dataset;

  @Column({ name: 'from', type: 'timestamptz' })
  from!: Date;

  @Column({ name: 'to', type: 'timestamptz' })
  to!: Date;

  @Column({
    name: 'recorded_at',
    type: 'timestamptz',
    default: () => 'clock_timestamp()',
  })
  recordedAt!: Date;
}
