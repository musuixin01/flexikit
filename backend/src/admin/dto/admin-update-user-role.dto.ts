import { IsIn } from 'class-validator';
import type { UserRole } from '../../users/user.entity';

export class AdminUpdateUserRoleDto {
  @IsIn(['user', 'admin'])
  readonly role!: UserRole;
}
