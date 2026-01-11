import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { BackgroundRemovalService } from './background-removal.service';
import { EmbeddingService } from './embedding.service';

@Module({
  controllers: [AiController],
  providers: [AiService, BackgroundRemovalService, EmbeddingService],
  exports: [AiService, BackgroundRemovalService, EmbeddingService],
})
export class AiModule {}
