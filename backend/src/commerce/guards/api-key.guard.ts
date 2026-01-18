import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Guard that validates API key from X-API-Key header.
 * Used for service-to-service authentication (e.g., scraping jobs).
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];

    const validApiKey = this.configService.get<string>('COMMERCE_API_KEY');

    if (!validApiKey) {
      // If no API key is configured, reject all API key auth attempts
      return false;
    }

    if (!apiKey) {
      return false;
    }

    if (apiKey !== validApiKey) {
      return false;
    }

    // Mark request as authenticated via API key
    request.isApiKeyAuth = true;
    return true;
  }
}

/**
 * Guard that allows access if EITHER the user is an admin OR has a valid API key.
 * This allows both admin dashboard access and service-to-service authentication.
 */
@Injectable()
export class AdminOrApiKeyGuard implements CanActivate {
  constructor(private apiKeyGuard: ApiKeyGuard) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // First, check if API key authentication succeeds
    const apiKeyValid = this.apiKeyGuard.canActivate(context);
    if (apiKeyValid) {
      return true;
    }

    // If no API key or invalid API key, check if user is authenticated
    // The RolesGuard will handle admin role validation
    const user = request.user;
    if (user && user.clerkId) {
      // User is authenticated, let RolesGuard handle admin check
      return true;
    }

    throw new UnauthorizedException(
      'Valid API key or admin authentication required',
    );
  }
}
