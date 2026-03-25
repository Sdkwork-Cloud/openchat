import { Body, Controller, Delete, Get, Param, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { assertAdminAccess } from '../../common/auth/admin-access.util';
import { CurrentUser } from '../user/decorators/current-user.decorator';
import { UserEntity } from '../user/entities/user.entity';
import { JwtAuthGuard } from '../user/guards/jwt-auth.guard';
import { AdminConsoleService } from './admin-console.service';
import {
  AdminAuditLogQueryDto,
  AdminConfigListQueryDto,
  AdminConfigUpsertDto,
} from './dto/admin.dto';

@ApiTags('admin-system')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('system')
export class AdminSystemController {
  constructor(private readonly adminConsoleService: AdminConsoleService) {}

  @Get('summary')
  async getSystemSummary(@CurrentUser() user: UserEntity) {
    this.assertAdmin(user);
    return this.adminConsoleService.getSystemSummary();
  }

  @Get('configs')
  async listConfigs(
    @CurrentUser() user: UserEntity,
    @Query() query: AdminConfigListQueryDto,
  ) {
    this.assertAdmin(user);
    return this.adminConsoleService.listConfigs(query);
  }

  @Put('configs')
  async upsertConfig(
    @CurrentUser() user: UserEntity,
    @Body() payload: AdminConfigUpsertDto,
  ) {
    this.assertAdmin(user);
    return this.adminConsoleService.upsertConfig(user.id, payload);
  }

  @Delete('configs/:key')
  async deleteConfig(
    @CurrentUser() user: UserEntity,
    @Param('key') key: string,
  ) {
    this.assertAdmin(user);
    return this.adminConsoleService.deleteConfig(user.id, key);
  }

  @Get('audit-logs')
  async listAuditLogs(
    @CurrentUser() user: UserEntity,
    @Query() query: AdminAuditLogQueryDto,
  ) {
    this.assertAdmin(user);
    return this.adminConsoleService.listAuditLogs(query);
  }

  private assertAdmin(user: UserEntity): void {
    assertAdminAccess(user);
  }
}
