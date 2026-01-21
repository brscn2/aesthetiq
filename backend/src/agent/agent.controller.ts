import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Res,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiProduces,
} from '@nestjs/swagger';
import { Response } from 'express';
import { AgentService } from './agent.service';
import { ChatRequestDto } from './dto/chat-request.dto';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('agent')
@Controller('agent')
@UseGuards(ClerkAuthGuard)
@ApiBearerAuth()
export class AgentController {
  private readonly logger = new Logger(AgentController.name);

  constructor(private readonly agentService: AgentService) {}

  @Post('chat')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Send a message to the AI stylist',
    description: 'Non-streaming chat endpoint. Returns the complete response after processing.',
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Chat response with styling recommendations',
    schema: {
      type: 'object',
      properties: {
        session_id: { type: 'string', description: 'Session identifier' },
        response: { type: 'string', description: 'AI response text' },
        intent: { type: 'string', enum: ['general', 'clothing'], description: 'Detected intent' },
        metadata: { type: 'object', description: 'Additional response metadata' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Agent service error' })
  async chat(
    @Body() chatRequest: ChatRequestDto,
    @CurrentUser() user: { clerkId: string },
  ) {
    this.logger.log(`Chat request from user ${user.clerkId}`);
    
    return this.agentService.chat({
      user_id: user.clerkId,
      session_id: chatRequest.sessionId,
      message: chatRequest.message,
    });
  }

  @Post('chat/stream')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Stream a chat response from the AI stylist',
    description: `
Streaming chat endpoint using Server-Sent Events (SSE).
Returns real-time progress updates as the AI processes your request.

**Event Types:**
- \`metadata\`: Session info (session_id, user_id)
- \`status\`: Human-readable progress message
- \`node_start\`/\`node_end\`: Workflow step tracking
- \`intent\`: Detected intent (general/clothing)
- \`items_found\`: Number of clothing items found
- \`chunk\`: Response text chunk (for streaming text)
- \`done\`: Final complete response with all data
- \`error\`: Error occurred
    `,
  })
  @ApiProduces('text/event-stream')
  @ApiResponse({ 
    status: 200, 
    description: 'SSE stream with chat events',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async chatStream(
    @Body() chatRequest: ChatRequestDto,
    @CurrentUser() user: { clerkId: string },
    @Res() res: Response,
  ) {
    this.logger.log(`Streaming chat request from user ${user.clerkId}`);
    
    await this.agentService.streamChat(
      {
        user_id: user.clerkId,
        session_id: chatRequest.sessionId,
        message: chatRequest.message,
      },
      res,
    );
  }

  @Get('health')
  @ApiOperation({ summary: 'Check agent service health' })
  @ApiResponse({ 
    status: 200, 
    description: 'Health status of the agent service',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['healthy', 'unhealthy', 'unreachable'] },
        gateway: { type: 'string', description: 'Gateway URL' },
      },
    },
  })
  async health() {
    return this.agentService.healthCheck();
  }
}
