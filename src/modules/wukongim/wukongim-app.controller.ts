import {
  Controller,
  Get,
  Logger,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthenticatedRequest } from '../../common/auth/interfaces/authenticated-request.interface';
import { JwtAuthGuard } from '../user/guards/jwt-auth.guard';
import { WukongIMService } from './wukongim.service';

@ApiTags('wukongim')
@Controller('wukongim')
export class WukongIMAppController {
  private readonly logger = new Logger(WukongIMAppController.name);

  constructor(private readonly wukongIMService: WukongIMService) {}

  @Get('config')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get WuKongIM connection config' })
  @ApiResponse({ status: 200, description: 'Connection config returned' })
  async getConfig(@Request() req: AuthenticatedRequest) {
    this.logger.log(`Get WuKongIM config for ${req.auth.userId}`);

    const config = this.wukongIMService.getConnectionConfig(req.auth.userId);

    return {
      success: true,
      data: config,
    };
  }

  @Post('token')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get WuKongIM user token' })
  @ApiResponse({ status: 200, description: 'Token returned' })
  async getToken(@Request() req: AuthenticatedRequest) {
    try {
      const token = await this.wukongIMService.getUserToken(req.auth.userId);

      return {
        success: true,
        data: { token },
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get token: ${message}`);
      return {
        success: false,
        message,
      };
    }
  }
}
