import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ContactService } from './contact.service';
import {
  Contact,
  CreateContactRequest,
  UpdateContactRequest,
} from './contact.interface';
import { JwtAuthGuard } from '../user/guards/jwt-auth.guard';

@ApiTags('contacts')
@Controller('contacts')
export class ContactController {
  constructor(private contactService: ContactService) {}

  /**
   * 创建联系人
   */
  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '创建联系人' })
  @ApiBody({
    description: '联系人信息',
    required: true,
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'string' },
        contactId: { type: 'string' },
        type: { type: 'string', enum: ['user', 'group'] },
        name: { type: 'string' },
        remark: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
      },
      required: ['userId', 'contactId', 'type', 'name'],
    },
  })
  @ApiResponse({ status: 201, description: '成功创建联系人', type: Contact })
  @ApiResponse({ status: 400, description: '联系人已存在' })
  async createContact(@Body() request: CreateContactRequest): Promise<Contact> {
    return this.contactService.createContact(request);
  }

  /**
   * 获取联系人详情
   */
  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '获取联系人详情' })
  @ApiParam({ name: 'id', description: '联系人ID' })
  @ApiResponse({ status: 200, description: '成功获取联系人详情', type: Contact })
  @ApiResponse({ status: 404, description: '联系人不存在' })
  async getContactById(@Param('id') id: string): Promise<Contact | null> {
    return this.contactService.getContactById(id);
  }

  /**
   * 获取用户的联系人列表
   */
  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '获取用户的联系人列表' })
  @ApiQuery({ name: 'userId', description: '用户ID', required: true })
  @ApiQuery({ name: 'type', description: '联系人类型', required: false, enum: ['user', 'group'] })
  @ApiQuery({ name: 'status', description: '联系人状态', required: false, enum: ['active', 'blocked', 'deleted'] })
  @ApiQuery({ name: 'isFavorite', description: '是否收藏', required: false })
  @ApiQuery({ name: 'tag', description: '标签', required: false })
  @ApiQuery({ name: 'keyword', description: '搜索关键词', required: false })
  @ApiQuery({ name: 'limit', description: '限制数量', required: false })
  @ApiQuery({ name: 'offset', description: '偏移量', required: false })
  @ApiResponse({ status: 200, description: '成功获取联系人列表', type: [Contact] })
  async getContactsByUserId(
    @Query('userId') userId: string,
    @Query('type') type?: 'user' | 'group',
    @Query('status') status?: 'active' | 'blocked' | 'deleted',
    @Query('isFavorite') isFavorite?: boolean,
    @Query('tag') tag?: string,
    @Query('keyword') keyword?: string,
    @Query('limit') limit: number = 50,
    @Query('offset') offset: number = 0,
  ): Promise<Contact[]> {
    return this.contactService.getContactsByUserId({
      userId,
      type,
      status,
      isFavorite,
      tag,
      keyword,
      limit,
      offset,
    });
  }

  /**
   * 更新联系人
   */
  @Put(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '更新联系人' })
  @ApiParam({ name: 'id', description: '联系人ID' })
  @ApiBody({
    description: '联系人更新信息',
    required: true,
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        remark: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
        isFavorite: { type: 'boolean' },
        status: { type: 'string', enum: ['active', 'blocked', 'deleted'] },
      },
    },
  })
  @ApiResponse({ status: 200, description: '成功更新联系人', type: Contact })
  @ApiResponse({ status: 404, description: '联系人不存在' })
  async updateContact(
    @Param('id') id: string,
    @Body() request: UpdateContactRequest,
  ): Promise<Contact | null> {
    return this.contactService.updateContact(id, request);
  }

  /**
   * 删除联系人
   */
  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '删除联系人' })
  @ApiParam({ name: 'id', description: '联系人ID' })
  @ApiResponse({ status: 200, description: '成功删除联系人' })
  @ApiResponse({ status: 404, description: '联系人不存在' })
  async deleteContact(@Param('id') id: string): Promise<boolean> {
    return this.contactService.deleteContact(id);
  }

  /**
   * 批量删除联系人
   */
  @Delete('batch')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '批量删除联系人' })
  @ApiBody({
    description: '联系人ID列表',
    required: true,
    schema: {
      type: 'object',
      properties: {
        ids: { type: 'array', items: { type: 'string' } },
      },
      required: ['ids'],
    },
  })
  @ApiResponse({ status: 200, description: '成功批量删除联系人' })
  async batchDeleteContacts(@Body('ids') ids: string[]): Promise<boolean> {
    return this.contactService.batchDeleteContacts(ids);
  }

  /**
   * 设置/取消收藏
   */
  @Put(':id/favorite')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '设置/取消收藏' })
  @ApiParam({ name: 'id', description: '联系人ID' })
  @ApiBody({
    description: '收藏状态',
    required: true,
    schema: {
      type: 'object',
      properties: {
        isFavorite: { type: 'boolean' },
      },
      required: ['isFavorite'],
    },
  })
  @ApiResponse({ status: 200, description: '成功更新收藏状态' })
  @ApiResponse({ status: 404, description: '联系人不存在' })
  async setFavorite(
    @Param('id') id: string,
    @Body('isFavorite') isFavorite: boolean,
  ): Promise<boolean> {
    return this.contactService.setFavorite(id, isFavorite);
  }

  /**
   * 设置备注
   */
  @Put(':id/remark')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '设置备注' })
  @ApiParam({ name: 'id', description: '联系人ID' })
  @ApiBody({
    description: '备注',
    required: true,
    schema: {
      type: 'object',
      properties: {
        remark: { type: 'string' },
      },
      required: ['remark'],
    },
  })
  @ApiResponse({ status: 200, description: '成功设置备注' })
  @ApiResponse({ status: 404, description: '联系人不存在' })
  async setRemark(
    @Param('id') id: string,
    @Body('remark') remark: string,
  ): Promise<boolean> {
    return this.contactService.setRemark(id, remark);
  }

  /**
   * 添加标签
   */
  @Post(':id/tags')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '添加标签' })
  @ApiParam({ name: 'id', description: '联系人ID' })
  @ApiBody({
    description: '标签',
    required: true,
    schema: {
      type: 'object',
      properties: {
        tag: { type: 'string' },
      },
      required: ['tag'],
    },
  })
  @ApiResponse({ status: 200, description: '成功添加标签' })
  @ApiResponse({ status: 404, description: '联系人不存在' })
  async addTag(@Param('id') id: string, @Body('tag') tag: string): Promise<boolean> {
    return this.contactService.addTag(id, tag);
  }

  /**
   * 移除标签
   */
  @Delete(':id/tags/:tag')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '移除标签' })
  @ApiParam({ name: 'id', description: '联系人ID' })
  @ApiParam({ name: 'tag', description: '标签' })
  @ApiResponse({ status: 200, description: '成功移除标签' })
  @ApiResponse({ status: 404, description: '联系人不存在' })
  async removeTag(@Param('id') id: string, @Param('tag') tag: string): Promise<boolean> {
    return this.contactService.removeTag(id, tag);
  }

  /**
   * 搜索联系人
   */
  @Get('search/:userId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '搜索联系人' })
  @ApiParam({ name: 'userId', description: '用户ID' })
  @ApiQuery({ name: 'keyword', description: '搜索关键词', required: true })
  @ApiResponse({ status: 200, description: '成功搜索联系人', type: [Contact] })
  async searchContacts(
    @Param('userId') userId: string,
    @Query('keyword') keyword: string,
  ): Promise<Contact[]> {
    return this.contactService.searchContacts(userId, keyword);
  }

  /**
   * 获取联系人统计
   */
  @Get('stats/:userId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '获取联系人统计' })
  @ApiParam({ name: 'userId', description: '用户ID' })
  @ApiResponse({ status: 200, description: '成功获取联系人统计' })
  async getContactStats(@Param('userId') userId: string): Promise<any> {
    return this.contactService.getContactStats(userId);
  }
}
