import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import type { JwtPayload } from './auth.service';
import { RefreshSession } from './refresh-session.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
    @InjectRepository(RefreshSession)
    private readonly refreshSessionsRepository: Repository<RefreshSession>,
  ) {
    const jwtSecret = configService.get<string>('JWT_SECRET');
    
    if (!jwtSecret) {
      throw new Error('JWT_SECRET must be set in environment variables. Please check your .env file.');
    }
    
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: JwtPayload) {
    if (payload.token_use !== undefined && payload.token_use !== 'access') {
      throw new UnauthorizedException();
    }
    const user = await this.usersService.findOne(payload.sub);
    if (!user || user.status !== 'active') {
      throw new UnauthorizedException();
    }

    if (payload.sid) {
      const session = await this.refreshSessionsRepository.findOne({
        where: {
          id: payload.sid,
          user_id: user.id,
        },
      });
      if (
        !session
        || session.revokedAt
        || session.expiresAt.getTime() <= Date.now()
      ) {
        throw new UnauthorizedException();
      }
    }

    return {
      userId: user.id,
      username: user.username,
      sessionId: payload.sid ?? null,
    };
  }
}
