import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { assertAdminAccess } from '../../common/auth/admin-access.util';
import { CurrentUser } from '../user/decorators/current-user.decorator';
import { JwtAuthGuard } from '../user/guards/jwt-auth.guard';
import { UserEntity } from '../user/entities/user.entity';
import { AdminConsoleService } from './admin-console.service';

@ApiTags('admin-dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class AdminDashboardController {
  constructor(private readonly adminConsoleService: AdminConsoleService) {}

  @Get('overview')
  async getOverview(@CurrentUser() user: UserEntity) {
    this.assertAdmin(user);
    return this.adminConsoleService.getDashboardOverview();
  }

  private assertAdmin(user: UserEntity): void {
    assertAdminAccess(user);
  }
}
