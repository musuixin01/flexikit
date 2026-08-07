import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * 可选 JWT 守卫：
 * - 请求带合法 Token 时，将 req.user 注入为当前用户；
 * - 请求未带 Token 或 Token 无效时，不阻断公开接口，按未登录处理。
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      await super.canActivate(context);
    } catch {
      // 公开接口允许匿名访问，认证失败时交给业务层按未登录处理。
    }
    return true;
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext, status?: any) {
    return user || null;
  }
}
