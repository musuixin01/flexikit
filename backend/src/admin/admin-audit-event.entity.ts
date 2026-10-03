import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type AdminAuditAccessMode = 'persistent-admin' | 'bootstrap-admin';

@Entity('admin_audit_events')
@Index('IDX_admin_audit_events_actor_user_id', ['actorUserId'])
@Index('IDX_admin_audit_events_target_user_id', ['targetUserId'])
@Index('IDX_admin_audit_events_created_at', ['createdAt'])
export class AdminAuditEvent {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'integer', name: 'actor_user_id' })
  actorUserId!: number;

  @Column({ type: 'varchar', length: 50, name: 'actor_username' })
  actorUsername!: string;

  @Column({ type: 'varchar', length: 24, name: 'access_mode' })
  accessMode!: AdminAuditAccessMode;

  @Column({ type: 'varchar', length: 80 })
  action!: string;

  @Column({ type: 'integer', name: 'target_user_id', nullable: true })
  targetUserId!: number | null;

  @Column({ type: 'varchar', length: 50, name: 'target_username', nullable: true })
  targetUsername!: string | null;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  metadata!: Record<string, string | number | boolean | null>;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}
