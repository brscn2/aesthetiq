import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { Webhook } from 'svix';
import { WebhooksService } from './webhooks.service';

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhooksController {
  constructor(
    private readonly webhooksService: WebhooksService,
    private readonly configService: ConfigService,
  ) {}

  @Post('clerk')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle Clerk webhook events' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid webhook payload' })
  async handleClerkWebhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Body() payload: any,
    @Headers('svix-id') svixId: string,
    @Headers('svix-timestamp') svixTimestamp: string,
    @Headers('svix-signature') svixSignature: string,
  ) {
    try {
      const webhookSecret = this.configService.get<string>('CLERK_WEBHOOK_SECRET');

      if (!webhookSecret) {
        throw new BadRequestException('CLERK_WEBHOOK_SECRET is not configured');
      }

      // Verify webhook signature using Svix if headers are present
      let eventType: string;
      let eventData: any;

      // Check if we have signature headers (webhook from Clerk)
      if (svixId && svixTimestamp && svixSignature) {
        // Get raw body for signature verification (provided by NestJS when rawBody: true)
        const rawBody = req.rawBody;
        if (!rawBody) {
          throw new BadRequestException('Raw body is required for webhook verification');
        }

        // Verify webhook signature using Svix
        const headers: Record<string, string> = {
          'svix-id': svixId,
          'svix-timestamp': svixTimestamp,
          'svix-signature': svixSignature,
        };

        try {
          const wh = new Webhook(webhookSecret);
          const verifiedPayload = wh.verify(rawBody, headers) as any;
          
          // Use the verified payload
          eventType = verifiedPayload.type;
          eventData = verifiedPayload.data;
        } catch (svixError) {
          // Svix verification failed
          console.error('Webhook signature verification failed:', svixError);
          throw new BadRequestException('Invalid webhook signature');
        }
      } else {
        // Fallback to parsed body if no signature headers (for testing/development)
        eventType = payload.type;
        eventData = payload.data;
      }

      switch (eventType) {
        case 'user.created':
          await this.webhooksService.handleUserCreated(eventData);
          break;
        case 'user.updated':
          await this.webhooksService.handleUserUpdated(eventData);
          break;
        case 'user.deleted':
          await this.webhooksService.handleUserDeleted(eventData);
          break;
        default:
          // Unknown event type, but return 200 to acknowledge receipt
          console.log(`Unhandled webhook event type: ${eventType}`);
      }

      return { received: true };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      console.error('Error processing Clerk webhook:', error);
      throw new BadRequestException('Failed to process webhook');
    }
  }
}

