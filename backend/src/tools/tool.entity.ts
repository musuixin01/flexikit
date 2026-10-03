import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { User } from '../users/user.entity';
import { VectorTransformer } from '../database/vector.transformer';

@Entity('tools')
export class Tool {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column({ nullable: true })
  user_id!: number | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user!: User | null;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'text' })
  url!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column('text', { array: true, nullable: true })
  tags!: string[] | null;

  @Index()
  @Column({ type: 'varchar', length: 50, nullable: true })
  category!: string | null;

  @Column({ type: 'text', nullable: true })
  icon!: string | null;

  @Index()
  @Column({ type: 'boolean', default: false })
  is_custom!: boolean;

  @Column({ type: 'text', nullable: true, name: 'local_path' })
  local_path!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'card_color' })
  card_color!: string | null;

  // pgvector 类型
  @Column('vector', {
    nullable: true,
    length: 1536,
    transformer: VectorTransformer,
    select: false,
  })
  embedding!: number[] | null;

  @Column({
    type: 'varchar',
    length: 32,
    nullable: true,
    name: 'embedding_provider',
    select: false,
  })
  embeddingProvider!: string | null;

  @Column({
    type: 'varchar',
    length: 120,
    nullable: true,
    name: 'embedding_model',
    select: false,
  })
  embeddingModel!: string | null;

  @Column({
    type: 'smallint',
    nullable: true,
    name: 'embedding_dimensions',
    select: false,
  })
  embeddingDimensions!: number | null;

  @Column({
    type: 'smallint',
    nullable: true,
    name: 'embedding_source_version',
    select: false,
  })
  embeddingSourceVersion!: number | null;

  @Column({
    type: 'char',
    length: 64,
    nullable: true,
    name: 'embedding_source_hash',
    select: false,
  })
  embeddingSourceHash!: string | null;

  @Column({
    type: 'timestamptz',
    nullable: true,
    name: 'embedding_updated_at',
    select: false,
  })
  embeddingUpdatedAt!: Date | null;

  @Column({ type: 'int', default: 0 })
  view_count!: number;

  @Column({ type: 'int', default: 0 })
  click_count!: number;

  @Column({ type: 'int', default: 0 })
  favorite_count!: number;

  @Index()
  @CreateDateColumn({ name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at!: Date;
}
