import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

import { MarketSnapshotEntity } from './market-snapshot.entity';
import { SourceDocumentEntity } from './source-document.entity';

@Entity('snapshot_documents')
export class SnapshotDocumentEntity {
  @PrimaryColumn({ name: 'snapshot_id', type: 'bigint' })
  snapshotId!: string;

  @PrimaryColumn({ name: 'document_hash', type: 'text' })
  documentHash!: string;

  @ManyToOne(() => MarketSnapshotEntity, {
    nullable: false,
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  @JoinColumn({
    name: 'snapshot_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'snapshot_documents_snapshot_id_fkey',
  })
  snapshot!: MarketSnapshotEntity;

  @ManyToOne(() => SourceDocumentEntity, {
    nullable: false,
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  @JoinColumn({
    name: 'document_hash',
    referencedColumnName: 'hash',
    foreignKeyConstraintName: 'snapshot_documents_document_hash_fkey',
  })
  document!: SourceDocumentEntity;
}
