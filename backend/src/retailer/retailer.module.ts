import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RetailerService } from './retailer.service';
import { RetailerController } from './retailer.controller';
import { Retailer, RetailerSchema } from './schemas/retailer.schema';
import { AdminModule } from '../admin/admin.module';
import { AuditModule } from '../audit/audit.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Retailer.name, schema: RetailerSchema }]),
    AdminModule,
    AuditModule,
    UsersModule,
  ],
  controllers: [RetailerController],
  providers: [RetailerService],
  exports: [RetailerService],
})
export class RetailerModule {}
