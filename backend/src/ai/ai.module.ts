import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { BackgroundRemovalService } from './background-removal.service';

@Module({
  controllers: [AiController],
  providers: [AiService, BackgroundRemovalService],
  exports: [AiService, BackgroundRemovalService],
})
export class AiModule {}
