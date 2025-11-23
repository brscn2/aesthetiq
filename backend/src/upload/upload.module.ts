import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { AzureStorageService } from './azure-storage.service';

@Module({
  controllers: [UploadController],
  providers: [AzureStorageService],
  exports: [AzureStorageService],
})
export class UploadModule {}

