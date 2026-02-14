import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentController } from './agent.controller';
import { AgentService } from './agent.service';
import { AgentGateway } from './agent.gateway';
import { AgentEventService } from './agent-event.service';
import { AgentRuntimeService } from './services/agent-runtime.service';
import { LLMProviderFactory } from './providers/llm-provider.factory';
import { ToolRegistry } from './tools/tool-registry.service';
import { SkillRegistry } from './skills/skill-registry.service';
import { MemoryModule } from './memory/memory.module';
import {
  Agent,
  AgentSession,
  AgentMessage,
  AgentTool,
  AgentSkill,
  AgentExecution,
} from './agent.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Agent,
      AgentSession,
      AgentMessage,
      AgentTool,
      AgentSkill,
      AgentExecution,
    ]),
    forwardRef(() => MemoryModule),
  ],
  controllers: [AgentController],
  providers: [
    AgentService,
    AgentGateway,
    AgentEventService,
    AgentRuntimeService,
    LLMProviderFactory,
    ToolRegistry,
    SkillRegistry,
  ],
  exports: [
    AgentService,
    AgentEventService,
    AgentRuntimeService,
    LLMProviderFactory,
    ToolRegistry,
    SkillRegistry,
  ],
})
export class AgentModule {}
