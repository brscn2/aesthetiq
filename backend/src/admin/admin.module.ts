import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminGuard } from './guards/admin.guard';
import { RolesGuard } from './guards/roles.guard';

@Module({
  imports: [UsersModule],
  controllers: [AdminController],
  providers: [AdminService, AdminGuard, RolesGuard],
  exports: [AdminService, AdminGuard, RolesGuard],
})
export class AdminModule {}