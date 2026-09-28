import { Column, Entity, PrimaryColumn } from 'typeorm';
import { Dataset } from '@power-market-dashboard/market';

@Entity('source_documents')
export class SourceDocumentEntity {
  @PrimaryColumn({ name: 'hash', type: 'text' })
  hash!: string;

  @Column({ name: 'dataset', type: 'text' })
  dataset!: Dataset;

  @Column({ name: 'source_id', type: 'text' })
  sourceId!: string;

  @Column({ name: 'revision', type: 'integer' })
  revision!: number;

  @Column({ name: 'source_created_at', type: 'timestamptz', nullable: true })
  sourceCreatedAt!: Date | null;

  @Column({ name: 'first_seen_at', type: 'timestamptz' })
  firstSeenAt!: Date;

  @Column({ name: 'stored_at', type: 'timestamptz', default: () => 'now()' })
  storedAt!: Date;

  @Column({ name: 'xml', type: 'text' })
  xml!: string;
}
