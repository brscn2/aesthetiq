import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { AdminUploadController } from './admin-upload.controller';
import { AzureStorageService } from './azure-storage.service';
import { AdminModule } from '../admin/admin.module';
import { AuditModule } from '../audit/audit.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [AdminModule, AuditModule, UsersModule],
  controllers: [UploadController, AdminUploadController],
  providers: [AzureStorageService],
  exports: [AzureStorageService],
})
export class UploadModule {}

