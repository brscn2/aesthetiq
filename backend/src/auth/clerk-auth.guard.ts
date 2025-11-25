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
      if ((result as any).errors) {
        console.error('Token verification errors:', (result as any).errors);
        throw new UnauthorizedException(`Invalid token: ${JSON.stringify((result as any).errors)}`);
      }

      // Based on the logs, when verification succeeds, the result object itself contains the JWT payload
      // The payload has properties like 'sub', 'iss', 'exp', etc.
      // Extract user ID from the payload - Clerk JWT tokens use 'sub' (subject) field for the user ID
      const userId = (result as any).sub;
      
      if (!userId || typeof userId !== 'string') {
        // Log the payload structure for debugging (remove in production if needed)
        console.error('Token payload structure:', JSON.stringify(result, null, 2));
        throw new UnauthorizedException('Invalid token: missing user ID');
      }

      // Attach the Clerk user ID to the request
      request.user = {
        clerkId: userId,
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

