import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StyleProfileService } from './style-profile.service';
import { StyleProfileController } from './style-profile.controller';
import {
  StyleProfile,
  StyleProfileSchema,
} from './schemas/style-profile.schema';
import {
  ImageAnalysisCache,
  ImageAnalysisCacheSchema,
} from './schemas/image-analysis-cache.schema';
import {
  PersonaAnalysisJob,
  PersonaAnalysisJobSchema,
} from './schemas/persona-analysis-job.schema';
import { AiModule } from '../ai/ai.module';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: StyleProfile.name, schema: StyleProfileSchema },
      { name: ImageAnalysisCache.name, schema: ImageAnalysisCacheSchema },
      { name: PersonaAnalysisJob.name, schema: PersonaAnalysisJobSchema },
    ]),
    AiModule,
    AdminModule,
  ],
  controllers: [StyleProfileController],
  providers: [StyleProfileService],
  exports: [StyleProfileService],
})
export class StyleProfileModule {}

