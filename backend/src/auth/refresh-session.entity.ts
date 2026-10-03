import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import type { AuthClientType } from './auth-client-context';

@Entity('refresh_sessions')
@Index('IDX_refresh_sessions_user_id', ['user_id'])
@Index('IDX_refresh_sessions_expires_at', ['expiresAt'])
@Index('IDX_refresh_sessions_user_client_instance', ['user_id', 'clientInstanceId'])
export class RefreshSession {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @Column({ type: 'integer', name: 'user_id' })
  user_id!: number;

  @Column({ type: 'varchar', length: 64, name: 'token_hash' })
  tokenHash!: string;

  @Column({
    type: 'varchar',
    length: 16,
    name: 'client_type',
    default: 'unknown',
  })
  clientType!: AuthClientType;

  @Column({ type: 'uuid', name: 'client_instance_id', nullable: true })
  clientInstanceId!: string | null;

  @Column({ type: 'varchar', length: 80, name: 'client_name', nullable: true })
  clientName!: string | null;

  @Column({ type: 'timestamptz', name: 'expires_at' })
  expiresAt!: Date;

  @Column({ type: 'timestamptz', name: 'revoked_at', nullable: true })
  revokedAt!: Date | null;

  @Column({ type: 'timestamptz', name: 'last_used_at', nullable: true })
  lastUsedAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => User, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user!: User;
}
