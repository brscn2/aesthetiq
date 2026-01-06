import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../users/schemas/user.schema';
import { AdminService } from '../admin.service';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private adminService: AdminService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.clerkId) {
      throw new ForbiddenException('User not authenticated');
    }

    // Check if user has admin role when admin access is required
    if (requiredRoles.includes(UserRole.ADMIN)) {
      const isAdmin = await this.adminService.isUserAdmin(user.clerkId);
      if (!isAdmin) {
        throw new ForbiddenException('Admin access required');
      }
    }

    return true;
  }
}