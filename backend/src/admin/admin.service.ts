import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/schemas/user.schema';

@Injectable()
export class AdminService {
  constructor(private readonly usersService: UsersService) {}

  async isUserAdmin(clerkId: string): Promise<boolean> {
    try {
      const user = await this.usersService.findByClerkId(clerkId);
      return user?.role === UserRole.ADMIN || false;
    } catch (error) {
      return false;
    }
  }

  async promoteUserToAdmin(clerkId: string): Promise<void> {
    const user = await this.usersService.findByClerkId(clerkId);
    if (user) {
      await this.usersService.update((user as any)._id.toString(), { role: UserRole.ADMIN });
    }
  }

  async demoteUserFromAdmin(clerkId: string): Promise<void> {
    const user = await this.usersService.findByClerkId(clerkId);
    if (user) {
      await this.usersService.update((user as any)._id.toString(), { role: UserRole.USER });
    }
  }
}