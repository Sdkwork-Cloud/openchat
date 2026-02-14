import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Req,
  ParseUUIDPipe,
  HttpStatus,
  HttpException,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { MemoryManagerService } from './memory-manager.service';
import { KnowledgeService } from './knowledge.service';
import {
  StoreMemoryDto,
  AddKnowledgeDocumentDto,
  MemoryType,
  MemorySource,
} from './dto/memory.dto';
import { AgentError, AgentErrorCode } from '../errors/agent.errors';

@ApiTags('Agent Memory')
@ApiBearerAuth()
@Controller('agents/:agentId/memory')
export class MemoryController {
  constructor(
    private memoryManager: MemoryManagerService,
    private knowledgeService: KnowledgeService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get memories for agent' })
  @ApiResponse({ status: 200, description: 'List of memories' })
  @ApiQuery({ name: 'type', required: false, enum: MemoryType })
  @ApiQuery({ name: 'source', required: false, enum: MemorySource })
  @ApiQuery({ name: 'sessionId', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async getMemories(
    @Param('agentId', ParseUUIDPipe) agentId: string,
    @Query('type') type?: MemoryType,
    @Query('source') source?: MemorySource,
    @Query('sessionId') sessionId?: string,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset?: number,
  ) {
    return this.memoryManager.search({
      agentId,
      type,
      source,
      sessionId,
      limit: Math.min(limit || 20, 100),
      offset: offset || 0,
    });
  }

  @Get('search')
  @ApiOperation({ summary: 'Search memories' })
  @ApiResponse({ status: 200, description: 'Search results' })
  async searchMemories(
    @Param('agentId', ParseUUIDPipe) agentId: string,
    @Query('q') query: string,
    @Query('type') type?: MemoryType,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit?: number,
    @Query('threshold', new DefaultValuePipe(0.7)) threshold?: number,
  ) {
    if (!query || query.trim().length === 0) {
      throw new HttpException('Query parameter "q" is required', HttpStatus.BAD_REQUEST);
    }

    return this.memoryManager.hybridSearch(query.trim(), agentId, Math.min(limit || 10, 100));
  }

  @Get('semantic-search')
  @ApiOperation({ summary: 'Semantic search memories' })
  @ApiResponse({ status: 200, description: 'Semantic search results' })
  async semanticSearch(
    @Param('agentId', ParseUUIDPipe) agentId: string,
    @Query('q') query: string,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit?: number,
  ) {
    if (!query || query.trim().length === 0) {
      throw new HttpException('Query parameter "q" is required', HttpStatus.BAD_REQUEST);
    }

    return this.memoryManager.semanticSearch(query.trim(), agentId, Math.min(limit || 10, 100));
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get memory statistics' })
  @ApiResponse({ status: 200, description: 'Memory statistics' })
  async getStats(@Param('agentId', ParseUUIDPipe) agentId: string) {
    return this.memoryManager.getStats(agentId);
  }

  @Get('sessions/:sessionId/history')
  @ApiOperation({ summary: 'Get conversation history' })
  @ApiResponse({ status: 200, description: 'Conversation history' })
  async getHistory(
    @Param('agentId', ParseUUIDPipe) agentId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Query('maxTokens', new DefaultValuePipe(8000), ParseIntPipe) maxTokens?: number,
  ) {
    return this.memoryManager.getConversationHistory(
      agentId,
      sessionId,
      Math.min(maxTokens || 8000, 32000),
    );
  }

  @Post('sessions/:sessionId/summarize')
  @ApiOperation({ summary: 'Summarize session' })
  @ApiResponse({ status: 200, description: 'Session summary' })
  async summarizeSession(
    @Param('agentId', ParseUUIDPipe) agentId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ) {
    return this.memoryManager.summarizeSession(agentId, sessionId);
  }

  @Post()
  @ApiOperation({ summary: 'Store a memory' })
  @ApiResponse({ status: 201, description: 'Memory stored successfully' })
  async storeMemory(
    @Param('agentId', ParseUUIDPipe) agentId: string,
    @Body() data: StoreMemoryDto,
    @Req() req: any,
  ) {
    const userId = req.user?.id;

    if (!data.content || data.content.trim().length === 0) {
      throw new HttpException('Content is required', HttpStatus.BAD_REQUEST);
    }

    return this.memoryManager.store({
      agentId,
      userId,
      content: data.content.trim(),
      type: data.type || MemoryType.EPISODIC,
      source: data.source || MemorySource.USER,
      sessionId: data.sessionId,
      timestamp: new Date(),
      metadata: data.metadata,
    });
  }

  @Delete(':memoryId')
  @ApiOperation({ summary: 'Delete a memory' })
  @ApiResponse({ status: 200, description: 'Memory deleted successfully' })
  @ApiResponse({ status: 404, description: 'Memory not found' })
  async deleteMemory(
    @Param('agentId', ParseUUIDPipe) agentId: string,
    @Param('memoryId', ParseUUIDPipe) memoryId: string,
  ) {
    const success = await this.memoryManager.delete(memoryId);
    if (!success) {
      throw new AgentError(
        'Memory not found',
        AgentErrorCode.MEMORY_STORE_FAILED,
        HttpStatus.NOT_FOUND,
        { memoryId },
      );
    }
    return { success: true };
  }

  @Delete('sessions/:sessionId')
  @ApiOperation({ summary: 'Clear session memories' })
  @ApiResponse({ status: 200, description: 'Session memories cleared' })
  async clearSession(
    @Param('agentId', ParseUUIDPipe) agentId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ) {
    await this.memoryManager.clear(agentId, sessionId);
    return { success: true };
  }

  @Post('consolidate')
  @ApiOperation({ summary: 'Consolidate memories' })
  @ApiResponse({ status: 200, description: 'Consolidation result' })
  async consolidate(@Param('agentId', ParseUUIDPipe) agentId: string) {
    return this.memoryManager.consolidateMemories(agentId);
  }

  @Get('knowledge')
  @ApiOperation({ summary: 'Get knowledge documents' })
  @ApiResponse({ status: 200, description: 'List of knowledge documents' })
  async getKnowledgeDocuments(@Param('agentId', ParseUUIDPipe) agentId: string) {
    return this.knowledgeService.getDocuments(agentId);
  }

  @Post('knowledge')
  @ApiOperation({ summary: 'Add knowledge document' })
  @ApiResponse({ status: 201, description: 'Document added successfully' })
  async addKnowledgeDocument(
    @Param('agentId', ParseUUIDPipe) agentId: string,
    @Body() data: AddKnowledgeDocumentDto,
  ) {
    if (!data.title || data.title.trim().length === 0) {
      throw new HttpException('Title is required', HttpStatus.BAD_REQUEST);
    }
    if (!data.content || data.content.trim().length === 0) {
      throw new HttpException('Content is required', HttpStatus.BAD_REQUEST);
    }

    return this.knowledgeService.addDocument(agentId, {
      title: data.title.trim(),
      content: data.content.trim(),
      description: data.description?.trim(),
      sourcePath: data.sourcePath,
      sourceType: data.sourceType,
      metadata: data.metadata,
    });
  }

  @Get('knowledge/search')
  @ApiOperation({ summary: 'Search knowledge' })
  @ApiResponse({ status: 200, description: 'Knowledge search results' })
  async searchKnowledge(
    @Param('agentId', ParseUUIDPipe) agentId: string,
    @Query('q') query: string,
    @Query('limit', new DefaultValuePipe(5), ParseIntPipe) limit?: number,
    @Query('threshold', new DefaultValuePipe(0.7)) threshold?: number,
  ) {
    if (!query || query.trim().length === 0) {
      throw new HttpException('Query parameter "q" is required', HttpStatus.BAD_REQUEST);
    }

    return this.knowledgeService.searchKnowledge(
      agentId,
      query.trim(),
      Math.min(limit || 5, 20),
      threshold,
    );
  }

  @Get('knowledge/stats')
  @ApiOperation({ summary: 'Get knowledge statistics' })
  @ApiResponse({ status: 200, description: 'Knowledge statistics' })
  async getKnowledgeStats(@Param('agentId', ParseUUIDPipe) agentId: string) {
    return this.knowledgeService.getKnowledgeStats(agentId);
  }

  @Get('knowledge/:documentId')
  @ApiOperation({ summary: 'Get knowledge document' })
  @ApiResponse({ status: 200, description: 'Knowledge document' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async getKnowledgeDocument(
    @Param('agentId', ParseUUIDPipe) agentId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
  ) {
    const document = await this.knowledgeService.getDocument(documentId);
    if (!document || document.agentId !== agentId) {
      throw new HttpException('Document not found', HttpStatus.NOT_FOUND);
    }
    return document;
  }

  @Delete('knowledge/:documentId')
  @ApiOperation({ summary: 'Delete knowledge document' })
  @ApiResponse({ status: 200, description: 'Document deleted successfully' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async deleteKnowledgeDocument(
    @Param('agentId', ParseUUIDPipe) agentId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
  ) {
    const document = await this.knowledgeService.getDocument(documentId);
    if (!document || document.agentId !== agentId) {
      throw new HttpException('Document not found', HttpStatus.NOT_FOUND);
    }

    await this.knowledgeService.deleteDocument(documentId);
    return { success: true };
  }

  @Get('knowledge/:documentId/chunks')
  @ApiOperation({ summary: 'Get document chunks' })
  @ApiResponse({ status: 200, description: 'Document chunks' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async getDocumentChunks(
    @Param('agentId', ParseUUIDPipe) agentId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
  ) {
    const document = await this.knowledgeService.getDocument(documentId);
    if (!document || document.agentId !== agentId) {
      throw new HttpException('Document not found', HttpStatus.NOT_FOUND);
    }

    return this.knowledgeService.getDocumentChunks(documentId);
  }
}
