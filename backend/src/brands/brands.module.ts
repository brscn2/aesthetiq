import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BrandsService } from './brands.service';
import { BrandsController } from './brands.controller';
import { PublicBrandsController } from './public-brands.controller';
import { Brand, BrandSchema } from './schemas/brand.schema';
import { AdminModule } from '../admin/admin.module';
import { AuditModule } from '../audit/audit.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Brand.name, schema: BrandSchema }]),
    AdminModule,
    AuditModule,
    UsersModule,
  ],
  controllers: [BrandsController, PublicBrandsController],
  providers: [BrandsService],
  exports: [BrandsService],
})
export class BrandsModule {}