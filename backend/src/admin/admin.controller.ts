import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Param,
  ParseIntPipe,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../common/types/authenticated-request';
import { AdminAccessGuard } from './admin-access.guard';
import { AdminAccessService } from './admin-access.service';
import { AdminService } from './admin.service';
import { AdminAuditQueryDto } from './dto/admin-audit-query.dto';
import { AdminDeleteUserDto } from './dto/admin-delete-user.dto';
import { AdminUpdateUserRoleDto } from './dto/admin-update-user-role.dto';
import { AdminUpdateUserStatusDto } from './dto/admin-update-user-status.dto';
import { AdminUsersQueryDto } from './dto/admin-users-query.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminAccessGuard)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly adminAccessService: AdminAccessService,
  ) {}

  @Get('access')
  getAccess(@Request() request: AuthenticatedRequest) {
    return this.adminAccessService.require(request.user.userId);
  }

  @Get('overview')
  getOverview() {
    return this.adminService.getOverview();
  }

  @Get('users')
  listUsers(@Query() query: AdminUsersQueryDto) {
    return this.adminService.listUsers(query);
  }

  @Get('users/:id')
  getUserDetail(@Param('id', ParseIntPipe) userId: number) {
    return this.adminService.getUserDetail(userId);
  }

  @Get('audit-events')
  listAuditEvents(@Query() query: AdminAuditQueryDto) {
    return this.adminService.listAuditEvents(query);
  }

  @Patch('users/:id/status')
  updateUserStatus(
    @Request() request: AuthenticatedRequest,
    @Param('id', ParseIntPipe) userId: number,
    @Body() dto: AdminUpdateUserStatusDto,
  ) {
    return this.adminService.updateUserStatus(
      request.user.userId,
      userId,
      dto.status,
    );
  }

  @Patch('users/:id/role')
  updateUserRole(
    @Request() request: AuthenticatedRequest,
    @Param('id', ParseIntPipe) userId: number,
    @Body() dto: AdminUpdateUserRoleDto,
  ) {
    return this.adminService.updateUserRole(
      request.user.userId,
      userId,
      dto.role,
    );
  }

  @Delete('users/:id')
  deleteUser(
    @Request() request: AuthenticatedRequest,
    @Param('id', ParseIntPipe) userId: number,
    @Body() dto: AdminDeleteUserDto,
  ) {
    return this.adminService.deleteUserAccount(
      request.user.userId,
      userId,
      dto.confirmationUsername,
    );
  }

  @Get('ai-usage')
  getAiUsageStatus() {
    return this.adminService.getAiUsageStatus();
  }
}
