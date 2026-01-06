import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { AdminService } from '../admin.service';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly adminService: AdminService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.clerkId) {
      throw new ForbiddenException('User not authenticated');
    }

    const isAdmin = await this.adminService.isUserAdmin(user.clerkId);
    
    if (!isAdmin) {
      throw new ForbiddenException('Admin access required');
    }

    return true;
  }
}