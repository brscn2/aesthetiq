import { Controller, Get, UseGuards } from '@nestjs/common';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(ClerkAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  async getDashboard(@CurrentUser() user: { clerkId: string }) {
    return {
      message: 'Welcome to the admin dashboard',
      user: user.clerkId,
      timestamp: new Date().toISOString(),
    };
  }
}