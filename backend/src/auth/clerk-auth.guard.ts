import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { verifyToken } from '@clerk/backend';

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      // Verify the token using Clerk
      const clerkSecretKey = this.configService.get<string>('CLERK_SECRET_KEY');
      
      if (!clerkSecretKey) {
        throw new Error('CLERK_SECRET_KEY is not configured');
      }

      // Verify the token
      const result = await verifyToken(token, {
        secretKey: clerkSecretKey,
      });

      // Check for errors first (discriminated union type)
      if (result.errors) {
        throw new UnauthorizedException('Invalid token');
      }

      // After checking for errors, TypeScript knows data exists
      // Type assertion needed because JwtPayload type may not be fully inferred
      const payload = result.data as { sub?: string };
      if (!payload || !payload.sub) {
        throw new UnauthorizedException('Invalid token: missing user ID');
      }

      // Attach the Clerk user ID to the request
      // The 'sub' field contains the user ID
      request.user = {
        clerkId: payload.sub,
      };

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}

