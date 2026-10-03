import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../common/types/authenticated-request';
import { AdminAccessService } from './admin-access.service';

@Injectable()
export class AdminAccessGuard implements CanActivate {
  constructor(private readonly adminAccessService: AdminAccessService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    await this.adminAccessService.require(request.user.userId);
    return true;
  }
}
