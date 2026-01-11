import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WardrobeService } from './wardrobe.service';
import { WardrobeController } from './wardrobe.controller';
import { AdminWardrobeController } from './admin-wardrobe.controller';
import { WardrobeItem, WardrobeItemSchema } from './schemas/wardrobe-item.schema';
import { UploadModule } from '../upload/upload.module';
import { AdminModule } from '../admin/admin.module';
import { AuditModule } from '../audit/audit.module';
import { UsersModule } from '../users/users.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WardrobeItem.name, schema: WardrobeItemSchema },
    ]),
    UploadModule,
    AdminModule,
    AuditModule,
    UsersModule,
    AiModule,
  ],
  controllers: [WardrobeController, AdminWardrobeController],
  providers: [WardrobeService],
  exports: [WardrobeService],
})
export class WardrobeModule {}

