import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../users/schemas/user.schema';
import { createClerkClient } from '@clerk/backend';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WebhooksService {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    private configService: ConfigService,
  ) {}

  async handleUserCreated(clerkUserData: any): Promise<void> {
    try {
      const clerkSecretKey = this.configService.get<string>('CLERK_SECRET_KEY');
      const clerk = createClerkClient({ secretKey: clerkSecretKey });

      // Fetch full user data from Clerk
      const clerkUser = await clerk.users.getUser(clerkUserData.id);

      // Validate email is present (required for sign up)
      const email = clerkUser.emailAddresses?.[0]?.emailAddress;
      if (!email) {
        throw new BadRequestException(
          `User ${clerkUser.id} created without email address. Email is required for sign up.`,
        );
      }

      // Create user in our database
      const firstName = clerkUser.firstName || '';
      const lastName = clerkUser.lastName || '';
      const username = clerkUser.username || '';
      const name = `${firstName} ${lastName}`.trim() || username || 'User';

      const user = new this.userModel({
        clerkId: clerkUser.id,
        email: email,
        name: name,
        avatarUrl: clerkUser.imageUrl,
        subscriptionStatus: 'FREE',
        settings: {
          units: 'METRIC',
          allowBiometrics: false,
        },
      });

      await user.save();
      console.log(`User created in database: ${clerkUser.id}`);
    } catch (error) {
      console.error('Error creating user from webhook:', error);
      throw error;
    }
  }

  async handleUserUpdated(clerkUserData: any): Promise<void> {
    try {
      const clerkSecretKey = this.configService.get<string>('CLERK_SECRET_KEY');
      const clerk = createClerkClient({ secretKey: clerkSecretKey });

      // Fetch full user data from Clerk
      const clerkUser = await clerk.users.getUser(clerkUserData.id);

      // Validate email is present (required)
      const email = clerkUser.emailAddresses?.[0]?.emailAddress;
      if (!email) {
        throw new BadRequestException(
          `User ${clerkUser.id} updated without email address. Email is required.`,
        );
      }

      // Update user in our database
      const firstName = clerkUser.firstName || '';
      const lastName = clerkUser.lastName || '';
      const username = clerkUser.username || '';
      const name = `${firstName} ${lastName}`.trim() || username || 'User';

      await this.userModel.findOneAndUpdate(
        { clerkId: clerkUser.id },
        {
          email: email,
          name: name,
          avatarUrl: clerkUser.imageUrl,
        },
        { new: true },
      );

      console.log(`User updated in database: ${clerkUser.id}`);
    } catch (error) {
      console.error('Error updating user from webhook:', error);
      throw error;
    }
  }

  async handleUserDeleted(clerkUserData: any): Promise<void> {
    try {
      // Delete user from our database
      await this.userModel.findOneAndDelete({ clerkId: clerkUserData.id });
      console.log(`User deleted from database: ${clerkUserData.id}`);
    } catch (error) {
      console.error('Error deleting user from webhook:', error);
      throw error;
    }
  }
}

