import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { Tool } from '../tools/tool.entity';
import { Favorite } from '../favorites/favorite.entity';
import { ToolOrder } from '../orders/tool-order.entity';
import { Category } from '../categories/category.entity';

export type UserAvatarType = 'upload' | 'preset' | 'emoji';
export type UserRole = 'user' | 'admin';
export type UserAccountStatus = 'active' | 'suspended';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  username!: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  email!: string;

  @Column({ type: 'text', name: 'password_hash' })
  password_hash!: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'display_name' })
  displayName!: string | null;

  @Column({ type: 'text', nullable: true })
  avatar!: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'avatar_type' })
  avatarType!: UserAvatarType | null;

  @Column({ type: 'varchar', length: 16, default: 'user' })
  role!: UserRole;

  @Column({ type: 'varchar', length: 16, default: 'active' })
  status!: UserAccountStatus;

  @CreateDateColumn({ name: 'created_at' })
  created_at!: Date;

  @OneToMany(() => Tool, tool => tool.user)
  tools!: Tool[];

  @OneToMany(() => Favorite, fav => fav.user)
  favorites!: Favorite[];

  @OneToMany(() => ToolOrder, order => order.user)
  toolOrders!: ToolOrder[];

  @OneToMany(() => Category, cat => cat.user)
  categories!: Category[];
}
