import { IsIn } from 'class-validator';
import type { UserAccountStatus } from '../../users/user.entity';

export class AdminUpdateUserStatusDto {
  @IsIn(['active', 'suspended'])
  readonly status!: UserAccountStatus;
}
