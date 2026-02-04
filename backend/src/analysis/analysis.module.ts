import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';
import { AnalysisService } from './analysis.service';
import { AnalysisController } from './analysis.controller';
import {
  ColorAnalysis,
  ColorAnalysisSchema,
} from './schemas/color-analysis.schema';
import { UploadModule } from '../upload/upload.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ColorAnalysis.name, schema: ColorAnalysisSchema },
    ]),
    HttpModule.register({
      timeout: 60000, // 60 seconds
      maxRedirects: 5,
    }),
    UploadModule,
    AiModule,
  ],
  controllers: [AnalysisController],
  providers: [AnalysisService],
  exports: [AnalysisService],
})
export class AnalysisModule {}

