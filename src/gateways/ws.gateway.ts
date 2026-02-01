import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

interface ClientInfo {
  userId: string;
  socketId: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  namespace: '/ws',
})
export class WSGateway {
  @WebSocketServer()
  server: Server;

  private logger = new Logger(WSGateway.name);
  private clients = new Map<string, ClientInfo>(); // socketId -> ClientInfo
  private userSockets = new Map<string, string[]>(); // userId -> socketIds

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    const clientInfo = this.clients.get(client.id);
    if (clientInfo) {
      // 从用户socket列表中移除
      const sockets = this.userSockets.get(clientInfo.userId) || [];
      const updatedSockets = sockets.filter(socketId => socketId !== client.id);
      if (updatedSockets.length > 0) {
        this.userSockets.set(clientInfo.userId, updatedSockets);
      } else {
        this.userSockets.delete(clientInfo.userId);
      }
      this.clients.delete(client.id);
      this.logger.log(`User ${clientInfo.userId} disconnected`);
    }
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('register')
  async register(@MessageBody() data: { userId: string }, @ConnectedSocket() client: Socket) {
    const { userId } = data;
    
    // 存储客户端信息
    this.clients.set(client.id, { userId, socketId: client.id });
    
    // 更新用户socket列表
    const existingSockets = this.userSockets.get(userId) || [];
    existingSockets.push(client.id);
    this.userSockets.set(userId, existingSockets);
    
    this.logger.log(`User ${userId} registered with socket ${client.id}`);
    
    return { success: true, message: 'Registered successfully' };
  }

  @SubscribeMessage('sendMessage')
  async sendMessage(@MessageBody() data: {
    fromUserId: string;
    toUserId: string;
    messageId: string;
    content: string;
    type: string;
  }) {
    const { toUserId } = data;
    
    // 发送消息给目标用户的所有连接
    const sockets = this.userSockets.get(toUserId) || [];
    sockets.forEach(socketId => {
      this.server.to(socketId).emit('newMessage', data);
    });
    
    return { success: true, message: 'Message sent' };
  }

  @SubscribeMessage('rtcSignal')
  async rtcSignal(@MessageBody() data: {
    fromUserId: string;
    toUserId: string;
    roomId: string;
    signal: any;
  }) {
    const { toUserId } = data;
    
    // 转发RTC信令给目标用户
    const sockets = this.userSockets.get(toUserId) || [];
    sockets.forEach(socketId => {
      this.server.to(socketId).emit('rtcSignal', data);
    });
    
    return { success: true, message: 'Signal forwarded' };
  }

  @SubscribeMessage('joinRoom')
  async joinRoom(@MessageBody() data: {
    userId: string;
    roomId: string;
  }, @ConnectedSocket() client: Socket) {
    const { roomId } = data;
    client.join(roomId);
    this.logger.log(`User ${data.userId} joined room ${roomId}`);
    
    // 通知房间内其他用户
    client.to(roomId).emit('userJoined', { userId: data.userId, roomId });
    
    return { success: true, message: 'Joined room' };
  }

  @SubscribeMessage('leaveRoom')
  async leaveRoom(@MessageBody() data: {
    userId: string;
    roomId: string;
  }, @ConnectedSocket() client: Socket) {
    const { roomId } = data;
    client.leave(roomId);
    this.logger.log(`User ${data.userId} left room ${roomId}`);
    
    // 通知房间内其他用户
    client.to(roomId).emit('userLeft', { userId: data.userId, roomId });
    
    return { success: true, message: 'Left room' };
  }

  @SubscribeMessage('sendGroupMessage')
  async sendGroupMessage(@MessageBody() data: {
    fromUserId: string;
    groupId: string;
    messageId: string;
    content: string;
    type: string;
  }, @ConnectedSocket() client: Socket) {
    const { groupId } = data;
    
    // 发送消息给群组
    client.to(groupId).emit('newGroupMessage', data);
    
    return { success: true, message: 'Group message sent' };
  }

  // 公开方法，用于其他服务调用
  notifyUser(userId: string, event: string, data: any) {
    const sockets = this.userSockets.get(userId) || [];
    sockets.forEach(socketId => {
      this.server.to(socketId).emit(event, data);
    });
  }

  notifyRoom(roomId: string, event: string, data: any) {
    this.server.to(roomId).emit(event, data);
  }

  broadcast(event: string, data: any) {
    this.server.emit(event, data);
  }
}