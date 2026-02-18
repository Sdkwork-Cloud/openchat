import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CrawController } from './craw.controller';
import { CrawService } from './craw.service';
import { CrawAgent } from './entities/craw-agent.entity';
import { CrawPost, CrawComment } from './entities/craw-post.entity';
import { CrawSubmolt, CrawSubmoltSubscriber, CrawSubmoltModerator, CrawFollow, CrawVote } from './entities/craw-submolt.entity';
import { CrawDmRequest, CrawDmConversation, CrawDmMessage } from './entities/craw-dm.entity';
import { CrawAgentService } from './services/craw-agent.service';
import { CrawPostService } from './services/craw-post.service';
import { CrawSubmoltService } from './services/craw-submolt.service';
import { CrawDmService } from './services/craw-dm.service';
import { CrawSearchService } from './services/craw-search.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CrawAgent,
      CrawPost,
      CrawComment,
      CrawSubmolt,
      CrawSubmoltSubscriber,
      CrawSubmoltModerator,
      CrawFollow,
      CrawVote,
      CrawDmRequest,
      CrawDmConversation,
      CrawDmMessage,
    ]),
  ],
  controllers: [CrawController],
  providers: [
    CrawService,
    CrawAgentService,
    CrawPostService,
    CrawSubmoltService,
    CrawDmService,
    CrawSearchService,
  ],
  exports: [CrawService],
})
export class CrawModule {}
