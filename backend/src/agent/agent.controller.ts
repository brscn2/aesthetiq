import {
  Controller,
  Post,
  Get,
  Body,
  Patch,
  Delete,
  Param,
  UseGuards,
  Res,
  HttpCode,
  HttpStatus,
  Logger,
  Headers,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiProduces,
  ApiParam,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { AgentService } from './agent.service';
import { ChatRequestDto } from './dto/chat-request.dto';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ChatService } from '../chat/chat.service';
import { UpdateChatSessionDto } from '../chat/dto/update-chat-session.dto';

@ApiTags('agent')
@Controller('agent')
@UseGuards(ClerkAuthGuard)
@ApiBearerAuth()
export class AgentController {
  private readonly logger = new Logger(AgentController.name);

  constructor(
    private readonly agentService: AgentService,
    private readonly chatService: ChatService,
  ) {}

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
    @Headers('authorization') authorization: string,
  ) {
    this.logger.log(`Chat request from user ${user.clerkId}`);
    
    // Extract the token (remove 'Bearer ' prefix)
    const authToken = authorization?.startsWith('Bearer ') 
      ? authorization.substring(7) 
      : undefined;
    
    this.logger.debug(`Auth token present: ${!!authToken}, length: ${authToken?.length || 0}`);
    
    return this.agentService.chat({
      user_id: user.clerkId,
      session_id: chatRequest.sessionId,
      message: chatRequest.message,
      pending_context: chatRequest.pendingContext,
      auth_token: authToken,
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
    @Headers('authorization') authorization: string,
    @Res() res: Response,
  ) {
    this.logger.log(`Streaming chat request from user ${user.clerkId}`);
    
    // Extract the token (remove 'Bearer ' prefix)
    const authToken = authorization?.startsWith('Bearer ') 
      ? authorization.substring(7) 
      : undefined;
    
    this.logger.debug(`Auth token present: ${!!authToken}, length: ${authToken?.length || 0}`);
    
    await this.agentService.streamChat(
      {
        user_id: user.clerkId,
        session_id: chatRequest.sessionId,
        message: chatRequest.message,
        pending_context: chatRequest.pendingContext,
        auth_token: authToken,
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

  @Get('sessions')
  @ApiOperation({ summary: 'List all chat sessions for the authenticated user' })
  @ApiResponse({ 
    status: 200, 
    description: 'List of chat sessions',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          userId: { type: 'string' },
          sessionId: { type: 'string' },
          title: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          messages: { type: 'array' },
        },
      },
    },
  })
  async listSessions(@CurrentUser() user: { clerkId: string }) {
    const sessions = await this.chatService.findAllByUserId(user.clerkId);
    // Transform to include last message preview
    return sessions.map((session) => {
      const lastMessage = session.messages && session.messages.length > 0
        ? session.messages[session.messages.length - 1]
        : null;
      return {
        ...(session as any).toObject(),
        lastMessagePreview: lastMessage?.content?.substring(0, 120) || null,
      };
    });
  }

  @Get('sessions/:sessionId')
  @ApiOperation({ summary: 'Get a chat session by session ID' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Chat session found',
  })
  @ApiResponse({ status: 404, description: 'Chat session not found' })
  async getSession(@Param('sessionId') sessionId: string) {
    const session = await this.chatService.findBySessionId(sessionId);
    if (!session) {
      throw new NotFoundException(`Chat session with sessionId ${sessionId} not found`);
    }
    return session;
  }

  @Post('sessions')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new chat session' })
  @ApiResponse({ 
    status: 201, 
    description: 'Chat session created',
  })
  async createSession(
    @Body() body: { title?: string; sessionId?: string },
    @CurrentUser() user: { clerkId: string },
  ) {
    const sessionId = body.sessionId || `session_${randomUUID().replace(/-/g, '').substring(0, 16)}`;
    const title = body.title || 'New Conversation';
    
    return this.chatService.create({
      sessionId,
      title,
      userId: user.clerkId,
      messages: [],
    });
  }

  @Patch('sessions/:sessionId')
  @ApiOperation({ summary: 'Update a chat session (e.g., rename)' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Chat session updated',
  })
  @ApiResponse({ status: 404, description: 'Chat session not found' })
  async updateSession(
    @Param('sessionId') sessionId: string,
    @Body() updateDto: UpdateChatSessionDto,
  ) {
    return this.chatService.updateBySessionId(sessionId, updateDto);
  }

  @Delete('sessions/:sessionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a chat session' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({ 
    status: 204, 
    description: 'Chat session deleted',
  })
  @ApiResponse({ status: 404, description: 'Chat session not found' })
  async deleteSession(@Param('sessionId') sessionId: string) {
    await this.chatService.removeBySessionId(sessionId);
  }
}
