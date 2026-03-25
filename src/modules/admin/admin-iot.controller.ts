import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { assertAdminAccess } from '../../common/auth/admin-access.util';
import { CurrentUser } from '../user/decorators/current-user.decorator';
import { UserEntity } from '../user/entities/user.entity';
import { JwtAuthGuard } from '../user/guards/jwt-auth.guard';
import { AdminConsoleService } from './admin-console.service';
import {
  AdminDeviceCommandDto,
  AdminDeviceCreateDto,
  AdminDeviceListQueryDto,
  AdminDeviceStatusUpdateDto,
} from './dto/admin.dto';

@ApiTags('admin-iot')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('iot')
export class AdminIotController {
  constructor(private readonly adminConsoleService: AdminConsoleService) {}

  @Get('devices')
  async listDevices(
    @CurrentUser() user: UserEntity,
    @Query() query: AdminDeviceListQueryDto,
  ) {
    this.assertAdmin(user);
    return this.adminConsoleService.listDevices(query);
  }

  @Post('devices')
  async createDevice(
    @CurrentUser() user: UserEntity,
    @Body() payload: AdminDeviceCreateDto,
  ) {
    this.assertAdmin(user);
    return this.adminConsoleService.createDevice(user.id, payload);
  }

  @Get('devices/:deviceId')
  async getDeviceDetail(
    @CurrentUser() user: UserEntity,
    @Param('deviceId') deviceId: string,
  ) {
    this.assertAdmin(user);
    return this.adminConsoleService.getDeviceDetail(deviceId);
  }

  @Put('devices/:deviceId/status')
  async updateDeviceStatus(
    @CurrentUser() user: UserEntity,
    @Param('deviceId') deviceId: string,
    @Body() payload: AdminDeviceStatusUpdateDto,
  ) {
    this.assertAdmin(user);
    return this.adminConsoleService.updateDeviceStatus(user.id, deviceId, payload);
  }

  @Post('devices/:deviceId/control')
  async controlDevice(
    @CurrentUser() user: UserEntity,
    @Param('deviceId') deviceId: string,
    @Body() payload: AdminDeviceCommandDto,
  ) {
    this.assertAdmin(user);
    return this.adminConsoleService.controlDevice(user.id, deviceId, payload);
  }

  @Delete('devices/:deviceId')
  async deleteDevice(
    @CurrentUser() user: UserEntity,
    @Param('deviceId') deviceId: string,
  ) {
    this.assertAdmin(user);
    return this.adminConsoleService.deleteDevice(user.id, deviceId);
  }

  private assertAdmin(user: UserEntity): void {
    assertAdminAccess(user);
  }
}
