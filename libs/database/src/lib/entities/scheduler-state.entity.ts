import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('scheduler_state')
export class SchedulerStateEntity {
  @PrimaryColumn({ name: 'key', type: 'text' })
  key!: string;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'now()' })
  updatedAt!: Date;
}
