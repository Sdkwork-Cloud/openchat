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
  Req,
  Sse,
  ParseUUIDPipe,
  HttpStatus,
  HttpException,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { AgentService } from './agent.service';
import { AgentRuntimeService } from './services/agent-runtime.service';
import { ToolRegistry } from './tools/tool-registry.service';
import { SkillRegistry } from './skills/skill-registry.service';
import { AgentStatus, AgentType, ChatRequest } from './agent.interface';
import { CreateAgent, UpdateAgent, SendAgentMessage, CreateSession, AddTool, AddSkill } from './dto/agent.dto';
import { AgentError, AgentErrorCode } from './errors/agent.errors';

@ApiTags('Agent')
@ApiBearerAuth()
@Controller('agents')
export class AgentController {
  constructor(
    private agentService: AgentService,
    private runtimeService: AgentRuntimeService,
    private toolRegistry: ToolRegistry,
    private skillRegistry: SkillRegistry,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new agent' })
  @ApiResponse({ status: 201, description: 'Agent created successfully' })
  async createAgent(@Body() data: CreateAgent, @Req() req: any) {
    const userId = req.user?.id || 'system';
    return this.agentService.createAgent(userId, {
      name: data.name,
      description: data.description,
      avatar: data.avatar,
      type: data.type as AgentType,
      config: data.config as any,
      isPublic: data.isPublic,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get all agents for current user' })
  @ApiResponse({ status: 200, description: 'List of agents' })
  async getAgents(@Req() req: any, @Query('public') isPublic?: string) {
    const userId = req.user?.id || 'system';
    
    if (isPublic === 'true') {
      return this.agentService.getPublicAgents();
    }
    
    return this.agentService.getAgentsByOwner(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get agent by ID' })
  @ApiResponse({ status: 200, description: 'Agent details' })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  async getAgent(@Param('id', ParseUUIDPipe) id: string) {
    const agent = await this.agentService.getAgentById(id);
    if (!agent) {
      throw AgentError.agentNotFound(id);
    }
    return agent;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update agent' })
  @ApiResponse({ status: 200, description: 'Agent updated successfully' })
  async updateAgent(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: UpdateAgent,
    @Req() req: any,
  ) {
    const userId = req.user?.id || 'system';
    return this.agentService.updateAgent(id, userId, {
      name: data.name,
      description: data.description,
      avatar: data.avatar,
      type: data.type as AgentType,
      config: data.config as any,
      isPublic: data.isPublic,
      status: data.status as AgentStatus,
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete agent' })
  @ApiResponse({ status: 200, description: 'Agent deleted successfully' })
  async deleteAgent(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    const userId = req.user?.id || 'system';
    const success = await this.agentService.deleteAgent(id, userId);
    if (!success) {
      throw AgentError.agentNotFound(id);
    }
    return { success: true };
  }

  @Post(':id/sessions')
  @ApiOperation({ summary: 'Create a new chat session' })
  @ApiResponse({ status: 201, description: 'Session created successfully' })
  async createSession(
    @Param('id', ParseUUIDPipe) agentId: string,
    @Body() data: CreateSession,
    @Req() req: any,
  ) {
    const userId = req.user?.id || 'system';
    return this.agentService.createSession(agentId, userId, data.title);
  }

  @Get(':id/sessions')
  @ApiOperation({ summary: 'Get sessions for agent' })
  @ApiResponse({ status: 200, description: 'List of sessions' })
  async getSessions(
    @Param('id', ParseUUIDPipe) agentId: string,
    @Req() req: any,
    @Query('limit') limit?: number,
  ) {
    const userId = req.user?.id || 'system';
    return this.agentService.getSessionsByUser(agentId, userId, limit || 20);
  }

  @Get('sessions/:sessionId')
  @ApiOperation({ summary: 'Get session by ID' })
  @ApiResponse({ status: 200, description: 'Session details' })
  async getSession(@Param('sessionId', ParseUUIDPipe) sessionId: string) {
    const session = await this.agentService.getSession(sessionId);
    if (!session) {
      throw AgentError.sessionNotFound(sessionId);
    }
    return session;
  }

  @Delete('sessions/:sessionId')
  @ApiOperation({ summary: 'Delete session' })
  @ApiResponse({ status: 200, description: 'Session deleted successfully' })
  async deleteSession(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Req() req: any,
  ) {
    const userId = req.user?.id || 'system';
    const success = await this.agentService.deleteSession(sessionId, userId);
    if (!success) {
      throw AgentError.sessionNotFound(sessionId);
    }
    return { success: true };
  }

  @Get('sessions/:sessionId/messages')
  @ApiOperation({ summary: 'Get messages for session' })
  @ApiResponse({ status: 200, description: 'List of messages' })
  async getMessages(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit?: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset?: number,
  ) {
    return this.agentService.getMessages(sessionId, Math.min(limit || 50, 200), offset || 0);
  }

  @Post('sessions/:sessionId/messages')
  @ApiOperation({ summary: 'Send a message to agent' })
  @ApiResponse({ status: 201, description: 'Message sent successfully' })
  async sendMessage(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() data: SendAgentMessage,
    @Req() req: any,
  ) {
    const userId = req.user?.id || 'system';
    const session = await this.agentService.getSession(sessionId);
    
    if (!session) {
      throw AgentError.sessionNotFound(sessionId);
    }

    const agent = await this.agentService.getAgentById(session.agentId);
    if (!agent) {
      throw AgentError.agentNotFound(session.agentId);
    }

    if (!data.content || data.content.trim().length === 0) {
      throw new HttpException('Message content is required', HttpStatus.BAD_REQUEST);
    }

    await this.agentService.addMessage(
      sessionId,
      session.agentId,
      userId,
      data.content.trim(),
      'user',
    );

    const runtime = await this.runtimeService.initializeRuntime(agent);
    
    const chatRequest: ChatRequest = {
      messages: [
        {
          id: `msg-${Date.now()}`,
          role: 'user',
          content: data.content.trim(),
          timestamp: Date.now(),
        },
      ],
      sessionId,
    };

    const response = await this.runtimeService.chat(
      runtime.id,
      chatRequest,
      sessionId,
      userId,
    );

    const assistantContent = typeof response.choices[0]?.message?.content === 'string'
      ? response.choices[0]?.message?.content
      : '';
    
    await this.agentService.addMessage(
      sessionId,
      session.agentId,
      userId,
      assistantContent,
      'assistant',
      {
        model: response.model,
        usage: response.usage,
      },
    );

    return {
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: assistantContent,
      createdAt: new Date(),
    };
  }

  @Sse('sessions/:sessionId/stream')
  @ApiOperation({ summary: 'Stream message from agent' })
  async streamMessage(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() data: SendAgentMessage,
    @Req() req: any,
  ) {
    const userId = req.user?.id || 'system';
    const session = await this.agentService.getSession(sessionId);
    
    if (!session) {
      throw AgentError.sessionNotFound(sessionId);
    }

    const agent = await this.agentService.getAgentById(session.agentId);
    if (!agent) {
      throw AgentError.agentNotFound(session.agentId);
    }

    if (!data.content || data.content.trim().length === 0) {
      throw new HttpException('Message content is required', HttpStatus.BAD_REQUEST);
    }

    await this.agentService.addMessage(
      sessionId,
      session.agentId,
      userId,
      data.content.trim(),
      'user',
    );

    const runtime = await this.runtimeService.initializeRuntime(agent);
    
    const chatRequest: ChatRequest = {
      messages: [
        {
          id: `msg-${Date.now()}`,
          role: 'user',
          content: data.content.trim(),
          timestamp: Date.now(),
        },
      ],
      sessionId,
      stream: true,
    };

    const stream = this.runtimeService.chatStream(
      runtime.id,
      chatRequest,
      sessionId,
      userId,
    );

    return from(stream).pipe(
      map((chunk) => ({
        data: JSON.stringify({
          id: chunk.id,
          content: chunk.choices[0]?.delta?.content || '',
          done: chunk.choices[0]?.finishReason !== null,
        }),
      })),
    );
  }

  @Get(':id/tools')
  @ApiOperation({ summary: 'Get tools for agent' })
  @ApiResponse({ status: 200, description: 'List of tools' })
  async getAgentTools(@Param('id', ParseUUIDPipe) agentId: string) {
    return this.agentService.getAgentTools(agentId);
  }

  @Post(':id/tools')
  @ApiOperation({ summary: 'Add tool to agent' })
  @ApiResponse({ status: 201, description: 'Tool added successfully' })
  async addToolToAgent(
    @Param('id', ParseUUIDPipe) agentId: string,
    @Body() data: AddTool,
  ) {
    return this.agentService.addToolToAgent(agentId, data);
  }

  @Get(':id/skills')
  @ApiOperation({ summary: 'Get skills for agent' })
  @ApiResponse({ status: 200, description: 'List of skills' })
  async getAgentSkills(@Param('id', ParseUUIDPipe) agentId: string) {
    return this.agentService.getAgentSkills(agentId);
  }

  @Post(':id/skills')
  @ApiOperation({ summary: 'Add skill to agent' })
  @ApiResponse({ status: 201, description: 'Skill added successfully' })
  async addSkillToAgent(
    @Param('id', ParseUUIDPipe) agentId: string,
    @Body() data: AddSkill,
  ) {
    return this.agentService.addSkillToAgent(agentId, data);
  }

  @Get('tools/available')
  @ApiOperation({ summary: 'Get all available tools' })
  @ApiResponse({ status: 200, description: 'List of available tools' })
  async getAvailableTools() {
    return this.toolRegistry.list();
  }

  @Get('skills/available')
  @ApiOperation({ summary: 'Get all available skills' })
  @ApiResponse({ status: 200, description: 'List of available skills' })
  async getAvailableSkills() {
    return this.skillRegistry.list();
  }

  @Post(':id/start')
  @ApiOperation({ summary: 'Start agent runtime' })
  @ApiResponse({ status: 200, description: 'Agent started successfully' })
  async startAgent(@Param('id', ParseUUIDPipe) id: string) {
    const agent = await this.agentService.getAgentById(id);
    if (!agent) {
      throw AgentError.agentNotFound(id);
    }

    const runtime = await this.runtimeService.initializeRuntime(agent);
    await this.agentService.updateAgentStatus(id, AgentStatus.READY);
    
    return { runtimeId: runtime.id, status: 'started' };
  }

  @Post(':id/stop')
  @ApiOperation({ summary: 'Stop agent runtime' })
  @ApiResponse({ status: 200, description: 'Agent stopped successfully' })
  async stopAgent(@Param('id', ParseUUIDPipe) id: string) {
    await this.agentService.updateAgentStatus(id, AgentStatus.IDLE);
    return { status: 'stopped' };
  }

  @Post(':id/reset')
  @ApiOperation({ summary: 'Reset agent' })
  @ApiResponse({ status: 200, description: 'Agent reset successfully' })
  async resetAgent(@Param('id', ParseUUIDPipe) id: string) {
    await this.agentService.updateAgentStatus(id, AgentStatus.IDLE);
    return { status: 'reset' };
  }
}
