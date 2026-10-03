import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Request, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import type { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { LoginDto, LogoutDto, RefreshTokenDto, RegisterDto } from './dto';
import { normalizeAuthClientContext } from './auth-client-context';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../common/types/authenticated-request';
import {
  clearBrowserRefreshCookie,
  isBrowserCookieAuthRequest,
  omitRefreshToken,
  readBrowserRefreshCookie,
  setBrowserRefreshCookie,
} from './browser-refresh-cookie';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  private browserCookieSecure(): boolean {
    return this.configService.get<string>('NODE_ENV') === 'production';
  }

  private finalizeAuthResponse(
    result: Awaited<ReturnType<AuthService['login']>>,
    response: ExpressResponse,
    browserCookieMode: boolean,
  ) {
    if (!browserCookieMode) return result;

    setBrowserRefreshCookie(
      response,
      result.refresh_token,
      result.refresh_expires_at,
      this.browserCookieSecure(),
    );
    return omitRefreshToken(result);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Request() req: ExpressRequest,
    @Res({ passthrough: true }) response: ExpressResponse,
  ) {
    const user = await this.authService.validateUser(loginDto.username, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('用户名或密码错误');
    }
    const result = await this.authService.login(
      user,
      normalizeAuthClientContext(loginDto),
    );
    return this.finalizeAuthResponse(
      result,
      response,
      isBrowserCookieAuthRequest(req),
    );
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() refreshDto: RefreshTokenDto,
    @Request() req: ExpressRequest,
    @Res({ passthrough: true }) response: ExpressResponse,
  ) {
    const browserCookieMode = isBrowserCookieAuthRequest(req);
    const refreshToken = refreshDto.refresh_token
      ?? (browserCookieMode ? readBrowserRefreshCookie(req) : null);

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh Token 无效或已失效');
    }

    const result = await this.authService.refresh(refreshToken);
    return this.finalizeAuthResponse(result, response, browserCookieMode);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async logout(
    @Body() logoutDto: LogoutDto,
    @Request() req: AuthenticatedRequest,
    @Res({ passthrough: true }) response: ExpressResponse,
  ) {
    const browserCookieMode = isBrowserCookieAuthRequest(req);
    const refreshToken = logoutDto.refresh_token
      ?? (browserCookieMode ? readBrowserRefreshCookie(req) : null)
      ?? undefined;

    if (browserCookieMode) {
      clearBrowserRefreshCookie(response, this.browserCookieSecure());
    }

    return this.authService.logout(
      req.user.userId,
      req.user.sessionId,
      refreshToken,
    );
  }

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  async listSessions(@Request() req: AuthenticatedRequest) {
    return this.authService.listManagedSessions(
      req.user.userId,
      req.user.sessionId,
    );
  }

  @Delete('sessions/:sessionId')
  @UseGuards(JwtAuthGuard)
  async revokeSession(
    @Param('sessionId', new ParseUUIDPipe({ version: '4' })) sessionId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.authService.revokeManagedSession(
      req.user.userId,
      sessionId,
      req.user.sessionId,
    );
  }

  @Post('register')
  async register(
    @Body() registerDto: RegisterDto,
    @Request() req: ExpressRequest,
    @Res({ passthrough: true }) response: ExpressResponse,
  ) {
    const result = await this.authService.register(
      registerDto.username,
      registerDto.email,
      registerDto.password,
      normalizeAuthClientContext(registerDto),
    );
    return this.finalizeAuthResponse(
      result,
      response,
      isBrowserCookieAuthRequest(req),
    );
  }
}