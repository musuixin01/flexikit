import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { User } from '../users/user.entity';

export interface JwtPayload {
  username: string;
  sub: number;
}

export interface AuthResult {
  access_token: string;
}

export interface SafeUser {
  id: number;
  username: string;
  email: string;
  displayName: string | null;
  avatar: string | null;
  avatarType: string | null;
  created_at: Date;
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(username: string, pass: string): Promise<SafeUser | null> {
    const user = await this.usersService.findByUsername(username);
    if (user && await bcrypt.compare(pass, user.password_hash)) {
      const { password_hash, ...result } = user;
      return result as SafeUser;
    }
    return null;
  }

  async login(user: SafeUser): Promise<AuthResult> {
    const payload: JwtPayload = { username: user.username, sub: user.id };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async register(username: string, email: string, password: string): Promise<AuthResult> {
    // 检查用户名是否已存在
    const existingUser = await this.usersService.findByUsername(username);
    if (existingUser) {
      throw new BadRequestException('用户名已存在');
    }

    // 检查邮箱是否已存在
    const existingEmail = await this.usersService.findByEmail(email);
    if (existingEmail) {
      throw new BadRequestException('邮箱已被注册');
    }

    const hashed = await bcrypt.hash(password, 12);
    const newUser = await this.usersService.create({
      username,
      email,
      password_hash: hashed,
    });
    // 生成 token
    const payload: JwtPayload = { username: newUser.username, sub: newUser.id };
    const access_token = this.jwtService.sign(payload);
    return { access_token };
  }
}