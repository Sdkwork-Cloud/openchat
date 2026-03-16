import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';
import { AgentGateway } from './agent.gateway';
import { AgentService } from './agent.service';
import { AgentRuntimeService } from './services/agent-runtime.service';
import { AgentEventService } from './agent-event.service';

type MockSocket = Partial<Socket> & {
  id: string;
  data: Record<string, unknown>;
  handshake: {
    auth?: Record<string, unknown>;
    query?: Record<string, unknown>;
  };
  emit: jest.Mock;
  disconnect: jest.Mock;
  join: jest.Mock;
  leave: jest.Mock;
};

function createClient(overrides?: Partial<MockSocket>): MockSocket {
  return {
    id: 'socket-1',
    data: {},
    handshake: {
      auth: {},
      query: {},
    },
    emit: jest.fn(),
    disconnect: jest.fn(),
    join: jest.fn(),
    leave: jest.fn(),
    ...overrides,
  };
}

describe('AgentGateway', () => {
  let gateway: AgentGateway;
  let jwtService: { verify: jest.Mock };
  let configService: { get: jest.Mock };
  let agentService: { getAgentById: jest.Mock };

  beforeEach(() => {
    jwtService = {
      verify: jest.fn(),
    };
    configService = {
      get: jest.fn().mockReturnValue('test-jwt-secret'),
    };
    agentService = {
      getAgentById: jest.fn(),
    };

    gateway = new AgentGateway(
      agentService as unknown as AgentService,
      {} as AgentRuntimeService,
      {} as AgentEventService,
      jwtService as unknown as JwtService,
      configService as unknown as ConfigService,
    );
  });

  it('should reject websocket connection when token is missing', () => {
    const client = createClient({
      handshake: {
        auth: {},
        query: {},
      },
    });

    gateway.handleConnection(client as Socket);

    expect(client.emit).toHaveBeenCalledWith('error', {
      message: 'Authentication token required',
    });
    expect(client.disconnect).toHaveBeenCalledTimes(1);
    expect(jwtService.verify).not.toHaveBeenCalled();
  });

  it('should reject websocket connection when payload does not contain userId', () => {
    const client = createClient({
      handshake: {
        auth: { token: 'token-1' },
        query: {},
      },
    });
    jwtService.verify.mockReturnValue({ username: 'alice' });

    gateway.handleConnection(client as Socket);

    expect(jwtService.verify).toHaveBeenCalledWith('token-1', {
      secret: 'test-jwt-secret',
    });
    expect(client.emit).toHaveBeenCalledWith('error', {
      message: 'Authentication payload missing userId',
    });
    expect(client.disconnect).toHaveBeenCalledTimes(1);
  });

  it('should accept websocket connection when payload contains userId', () => {
    const client = createClient({
      handshake: {
        auth: { token: 'token-2' },
        query: {},
      },
    });
    jwtService.verify.mockReturnValue({
      userId: 'user-100',
      username: 'alice',
    });

    gateway.handleConnection(client as Socket);

    expect(jwtService.verify).toHaveBeenCalledWith('token-2', {
      secret: 'test-jwt-secret',
    });
    expect(client.disconnect).not.toHaveBeenCalled();
    expect(client.emit).toHaveBeenCalledWith('connected', {
      message: 'Connected successfully',
      userId: 'user-100',
    });
    expect(client.data.user).toMatchObject({
      userId: 'user-100',
      username: 'alice',
    });
  });

  it('should reject join_agent when websocket client is not authenticated', async () => {
    const client = createClient({
      data: {},
    });

    await gateway.handleJoinAgent({ agentId: 'agent-1' }, client as Socket);

    expect(client.emit).toHaveBeenCalledWith('error', {
      message: 'Not authenticated',
    });
    expect(agentService.getAgentById).not.toHaveBeenCalled();
  });
});

