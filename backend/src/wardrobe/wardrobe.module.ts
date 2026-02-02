import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WardrobeService } from './wardrobe.service';
import { IntelligenceService } from './intelligence/intelligence.service';
import { WardrobeController } from './wardrobe.controller';
import { AdminWardrobeController } from './admin-wardrobe.controller';
import { WardrobeItem, WardrobeItemSchema } from './schemas/wardrobe-item.schema';
import { ItemFeedback, ItemFeedbackSchema } from './schemas/item-feedback.schema';
import { StyleProfile, StyleProfileSchema } from '../style-profile/schemas/style-profile.schema';
import { ColorAnalysis, ColorAnalysisSchema } from '../analysis/schemas/color-analysis.schema';
import { UploadModule } from '../upload/upload.module';
import { AdminModule } from '../admin/admin.module';
import { AuditModule } from '../audit/audit.module';
import { UsersModule } from '../users/users.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WardrobeItem.name, schema: WardrobeItemSchema },
      { name: ItemFeedback.name, schema: ItemFeedbackSchema },
      { name: StyleProfile.name, schema: StyleProfileSchema },
      { name: ColorAnalysis.name, schema: ColorAnalysisSchema },
    ]),
    UploadModule,
    AdminModule,
    AuditModule,
    UsersModule,
    AiModule,
  ],
  controllers: [WardrobeController, AdminWardrobeController],
  providers: [WardrobeService, IntelligenceService],
  exports: [WardrobeService, IntelligenceService],
})
export class WardrobeModule {}

