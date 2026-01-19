import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { CommerceService } from './commerce.service';
import { CommerceController } from './commerce.controller';
import { AdminCommerceController } from './admin-commerce.controller';
import { CommerceItem, CommerceItemSchema } from './schemas/commerce-item.schema';
import { ApiKeyGuard, AdminOrApiKeyGuard } from './guards/api-key.guard';
import { AdminModule } from '../admin/admin.module';
import { AuditModule } from '../audit/audit.module';
import { UsersModule } from '../users/users.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CommerceItem.name, schema: CommerceItemSchema },
    ]),
    ConfigModule,
    AdminModule,
    AuditModule,
    UsersModule,
    AiModule,
  ],
  controllers: [CommerceController, AdminCommerceController],
  providers: [CommerceService, ApiKeyGuard, AdminOrApiKeyGuard],
  exports: [CommerceService],
})
export class CommerceModule {}
