import { Controller, Get, Put, Delete, Body, UseGuards, Request, Res, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response as ExpressResponse } from 'express';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';
import type { AuthenticatedRequest } from '../common/types/authenticated-request';
import { clearBrowserRefreshCookie } from '../auth/browser-refresh-cookie';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private usersService: UsersService,
    private configService: ConfigService,
  ) {}

  @Get('profile')
  async getProfile(@Request() req: AuthenticatedRequest) {
    const user = await this.usersService.findOne(req.user.userId);
    if (!user) throw new NotFoundException('用户不存在');
    const { password_hash, ...profile } = user;
    return profile;
  }

  @Put('profile')
  async updateProfile(@Request() req: AuthenticatedRequest, @Body() updateDto: UpdateProfileDto) {
    const updated = await this.usersService.update(req.user.userId, updateDto);
    const { password_hash, ...profile } = updated;
    return profile;
  }

  @Get('export-data')
  async exportData(@Request() req: AuthenticatedRequest) {
    return this.usersService.exportUserData(req.user.userId);
  }

  @Delete('account')
  async deleteAccount(
    @Request() req: AuthenticatedRequest,
    @Body() _deleteDto: DeleteAccountDto,
    @Res({ passthrough: true }) response: ExpressResponse,
  ) {
    await this.usersService.deleteUserAccount(req.user.userId);
    clearBrowserRefreshCookie(
      response,
      this.configService.get<string>('NODE_ENV') === 'production',
    );
    return { message: '账户已成功删除' };
  }
}
