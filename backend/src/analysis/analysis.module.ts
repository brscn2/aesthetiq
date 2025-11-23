import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AnalysisService } from './analysis.service';
import { AnalysisController } from './analysis.controller';
import {
  ColorAnalysis,
  ColorAnalysisSchema,
} from './schemas/color-analysis.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ColorAnalysis.name, schema: ColorAnalysisSchema },
    ]),
  ],
  controllers: [AnalysisController],
  providers: [AnalysisService],
  exports: [AnalysisService],
})
export class AnalysisModule {}

