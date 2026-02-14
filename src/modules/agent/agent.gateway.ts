import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AgentService } from './agent.service';
import { AgentRuntimeService } from './services/agent-runtime.service';
import { AgentEventService } from './agent-event.service';
import { AgentEventType, ChatRequest } from './agent.interface';

@WebSocketGateway({
  namespace: '/agents',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class AgentGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AgentGateway.name);
  private readonly userSockets: Map<string, string> = new Map();

  constructor(
    private agentService: AgentService,
    private runtimeService: AgentRuntimeService,
    private agentEventService: AgentEventService,
    private jwtService: JwtService,
  ) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);

    const token = client.handshake.auth.token || client.handshake.query.token;
    if (!token) {
      this.logger.warn(`Client ${client.id} connected without token`);
      client.emit('error', { message: 'Authentication token required' });
      client.disconnect();
      return;
    }

    try {
      const payload = this.jwtService.verify(token as string);
      client.data.user = payload;
      this.userSockets.set(payload.id, client.id);
      this.logger.log(`User ${payload.id} connected with socket ${client.id}`);

      client.emit('connected', {
        message: 'Connected successfully',
        userId: payload.id,
      });
    } catch (error) {
      this.logger.error(`JWT verification failed for client ${client.id}:`, error);
      client.emit('error', { message: 'Authentication failed' });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    const userId = client.data.user?.id;
    if (userId && this.userSockets.get(userId) === client.id) {
      this.userSockets.delete(userId);
      this.logger.log(`User ${userId} disconnected`);
    }
  }

  @SubscribeMessage('join_agent')
  async handleJoinAgent(
    @MessageBody() data: { agentId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { agentId } = data;
    const userId = client.data.user?.id;

    if (!userId) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }

    const agent = await this.agentService.getAgentById(agentId);
    if (!agent) {
      client.emit('error', { message: 'Agent not found' });
      return;
    }

    const roomId = `agent:${agentId}`;
    await client.join(roomId);

    this.logger.log(`User ${userId} joined agent room ${agentId}`);

    client.emit('joined_agent', {
      agentId,
      message: 'Successfully joined agent room',
    });
  }

  @SubscribeMessage('leave_agent')
  async handleLeaveAgent(
    @MessageBody() data: { agentId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { agentId } = data;
    const roomId = `agent:${agentId}`;

    await client.leave(roomId);

    this.logger.log(`User ${client.data.user?.id} left agent room ${agentId}`);

    client.emit('left_agent', {
      agentId,
      message: 'Left agent room',
    });
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @MessageBody() data: { agentId: string; sessionId?: string; content: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { agentId, sessionId, content } = data;
    const userId = client.data.user?.id;

    if (!userId) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }

    try {
      const agent = await this.agentService.getAgentById(agentId);
      if (!agent) {
        client.emit('error', { message: 'Agent not found' });
        return;
      }

      let targetSessionId = sessionId;
      if (!targetSessionId) {
        const session = await this.agentService.createSession(agentId, userId);
        targetSessionId = session.id;

        client.emit('session_created', {
          sessionId: targetSessionId,
          agentId,
        });
      }

      await this.agentService.addMessage(targetSessionId, agentId, userId, content, 'user');

      const runtime = await this.runtimeService.initializeRuntime(agent);

      const chatRequest: ChatRequest = {
        messages: [
          {
            id: `msg-${Date.now()}`,
            role: 'user',
            content,
            timestamp: Date.now(),
          },
        ],
        sessionId: targetSessionId,
      };

      const response = await this.runtimeService.chat(
        runtime.id,
        chatRequest,
        targetSessionId,
        userId,
      );

      const assistantContent = typeof response.choices[0]?.message?.content === 'string'
        ? response.choices[0]?.message?.content
        : '';

      await this.agentService.addMessage(
        targetSessionId,
        agentId,
        userId,
        assistantContent,
        'assistant',
        {
          model: response.model,
          usage: response.usage,
        },
      );

      client.emit('message_sent', {
        sessionId: targetSessionId,
        message: {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: assistantContent,
          createdAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error('Error sending message:', error);
      client.emit('error', {
        message: error.message || 'Failed to send message',
        code: 'SEND_MESSAGE_ERROR',
      });
    }
  }

  @SubscribeMessage('stream_message')
  async handleStreamMessage(
    @MessageBody() data: { agentId: string; sessionId?: string; content: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { agentId, sessionId, content } = data;
    const userId = client.data.user?.id;

    if (!userId) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }

    try {
      const agent = await this.agentService.getAgentById(agentId);
      if (!agent) {
        client.emit('error', { message: 'Agent not found' });
        return;
      }

      let targetSessionId = sessionId;
      if (!targetSessionId) {
        const session = await this.agentService.createSession(agentId, userId);
        targetSessionId = session.id;

        client.emit('session_created', {
          sessionId: targetSessionId,
          agentId,
        });
      }

      await this.agentService.addMessage(targetSessionId, agentId, userId, content, 'user');

      const runtime = await this.runtimeService.initializeRuntime(agent);

      const chatRequest: ChatRequest = {
        messages: [
          {
            id: `msg-${Date.now()}`,
            role: 'user',
            content,
            timestamp: Date.now(),
          },
        ],
        sessionId: targetSessionId,
        stream: true,
      };

      const stream = this.runtimeService.chatStream(
        runtime.id,
        chatRequest,
        targetSessionId,
        userId,
      );

      let fullContent = '';

      for await (const chunk of stream) {
        const chunkContent = chunk.choices[0]?.delta?.content || '';
        fullContent += chunkContent;

        client.emit('stream_chunk', {
          sessionId: targetSessionId,
          content: chunkContent,
          done: chunk.choices[0]?.finishReason !== null,
        });
      }

      await this.agentService.addMessage(
        targetSessionId,
        agentId,
        userId,
        fullContent,
        'assistant',
      );

      client.emit('stream_complete', {
        sessionId: targetSessionId,
      });
    } catch (error) {
      this.logger.error('Error in stream message:', error);
      client.emit('error', {
        message: error.message || 'Stream failed',
        code: 'STREAM_ERROR',
      });
    }
  }

  @SubscribeMessage('get_history')
  async handleGetHistory(
    @MessageBody() data: { sessionId: string; limit?: number },
    @ConnectedSocket() client: Socket,
  ) {
    const { sessionId, limit = 50 } = data;
    const userId = client.data.user?.id;

    if (!userId) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }

    try {
      const session = await this.agentService.getSession(sessionId);
      if (!session || session.userId !== userId) {
        client.emit('error', { message: 'Access denied to this session' });
        return;
      }

      const messages = await this.agentService.getMessages(sessionId, limit);

      client.emit('history', {
        sessionId,
        messages,
      });
    } catch (error) {
      this.logger.error('Error getting history:', error);
      client.emit('error', {
        message: error.message || 'Failed to get history',
        code: 'GET_HISTORY_ERROR',
      });
    }
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    client.emit('pong', { timestamp: Date.now() });
  }
}
