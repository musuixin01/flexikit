import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('discovery_tools')
export class DiscoveryTool {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  @Index()
  name: string;

  @Column({ length: 500 })
  url: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ length: 100, nullable: true })
  category: string;

  @Column({ type: 'simple-array', default: '' })
  tags: string[];

  @Column({ type: 'text', nullable: true })
  icon: string;

  /** 来源平台：appinn / producthunt / v2ex / juejin / iplaysoft */
  @Column({ length: 50 })
  @Index()
  source: string;

  /** 来源文章链接 */
  @Column({ length: 500, nullable: true })
  source_url: string;

  /** 热度分 */
  @Column({ type: 'float', default: 0 })
  @Index()
  hot_score: number;

  /** 点赞/投票数 */
  @Column({ default: 0 })
  upvotes: number;

  /** 评论数 */
  @Column({ default: 0 })
  comments: number;

  /** 首次发现时间 */
  @Column({ type: 'timestamp', nullable: true })
  @Index()
  discovered_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
