import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { User } from '../users/user.entity';
import { Tool } from '../tools/tool.entity';

@Entity('favorites')
export class Favorite {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int', name: 'user_id' })
  user_id!: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'int', name: 'tool_id' }) 
  tool_id!: number;

  @ManyToOne(() => Tool)
  @JoinColumn({ name: 'tool_id' })
  tool!: Tool;

  @CreateDateColumn({ name: 'created_at' })
  created_at!: Date;
}