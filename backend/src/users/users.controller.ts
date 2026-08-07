import { Controller, Get, Put, Delete, Body, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('profile')
  async getProfile(@Request() req) {
    const user = await this.usersService.findOne(req.user.userId);
    if (!user) throw new Error('User not found');
    // 移除敏感字段
    const { password_hash, ...profile } = user;
    return profile;
  }

  @Put('profile')
  async updateProfile(@Request() req, @Body() updateDto: UpdateProfileDto) {
    const updated = await this.usersService.update(req.user.userId, updateDto);
    const { password_hash, ...profile } = updated;
    return profile;
  }

  /**
   * GDPR 数据导出：导出用户的所有个人数据
   */
  @Get('export-data')
  async exportData(@Request() req) {
    return this.usersService.exportUserData(req.user.userId);
  }

  /**
   * GDPR 账号删除：永久删除用户账户及所有关联数据
   */
  @Delete('account')
  async deleteAccount(@Request() req) {
    await this.usersService.deleteUserAccount(req.user.userId);
    return { message: '账户已成功删除' };
  }
}