import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { assertAdminAccess } from '../../common/auth/admin-access.util';
import { CurrentUser } from '../user/decorators/current-user.decorator';
import { UserEntity } from '../user/entities/user.entity';
import { JwtAuthGuard } from '../user/guards/jwt-auth.guard';
import { AdminConsoleService } from './admin-console.service';
import { AdminMessageListQueryDto } from './dto/admin.dto';

@ApiTags('admin-messages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('messages')
export class AdminMessagesController {
  constructor(private readonly adminConsoleService: AdminConsoleService) {}

  @Get()
  async listMessages(
    @CurrentUser() user: UserEntity,
    @Query() query: AdminMessageListQueryDto,
  ) {
    this.assertAdmin(user);
    return this.adminConsoleService.listMessages(query);
  }

  @Get(':id')
  async getMessageDetail(
    @CurrentUser() user: UserEntity,
    @Param('id') messageId: string,
  ) {
    this.assertAdmin(user);
    return this.adminConsoleService.getMessageDetail(messageId);
  }

  @Delete(':id')
  async deleteMessage(
    @CurrentUser() user: UserEntity,
    @Param('id') messageId: string,
  ) {
    this.assertAdmin(user);
    return this.adminConsoleService.deleteMessage(user.id, messageId);
  }

  @Post(':id/recall')
  async recallMessage(
    @CurrentUser() user: UserEntity,
    @Param('id') messageId: string,
  ) {
    this.assertAdmin(user);
    return this.adminConsoleService.recallMessage(user.id, messageId);
  }

  private assertAdmin(user: UserEntity): void {
    assertAdminAccess(user);
  }
}
