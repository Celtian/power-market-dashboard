import { Check, Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { Dataset } from '@power-market-dashboard/market';

@Entity('import_jobs')
@Index('import_jobs_active', ['dataset', 'from', 'to'], {
  unique: true,
  where: "state IN ('pending','published','running','retry')",
})
@Index('import_jobs_dispatch', ['state', 'nextAttemptAt'])
@Check(
  'import_jobs_dataset_check',
  "dataset IN ('solar-actual','solar-forecast','afrr','mfrr')",
)
@Check('import_jobs_priority_check', "priority IN ('live','history')")
@Check(
  'import_jobs_state_check',
  "state IN ('pending','published','running','retry','complete','dead')",
)
@Check('import_jobs_check', '"to" > "from"')
export class ImportJobEntity {
  @PrimaryGeneratedColumn({ name: 'id', type: 'bigint' })
  id!: string;

  @Column({ name: 'dataset', type: 'text' })
  dataset!: Dataset;

  @Column({ name: 'from', type: 'timestamptz' })
  from!: Date;

  @Column({ name: 'to', type: 'timestamptz' })
  to!: Date;

  @Column({ name: 'priority', type: 'text' })
  priority!: 'live' | 'history';

  @Column({ name: 'state', type: 'text', default: 'pending' })
  state!: 'pending' | 'published' | 'running' | 'retry' | 'complete' | 'dead';

  @Column({ name: 'attempts', type: 'integer', default: 0 })
  attempts!: number;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'now()' })
  updatedAt!: Date;

  @Column({
    name: 'next_attempt_at',
    type: 'timestamptz',
    default: () => 'now()',
  })
  nextAttemptAt!: Date;

  @Column({ name: 'error', type: 'text', nullable: true })
  error!: string | null;

  @Column({ name: 'fetch_ms', type: 'double precision', nullable: true })
  fetchMs!: number | null;

  @Column({ name: 'queue_ms', type: 'double precision', nullable: true })
  queueMs!: number | null;

  @Column({ name: 'processing_ms', type: 'double precision', nullable: true })
  processingMs!: number | null;
}
