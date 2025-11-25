import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { CreateChatSessionDto } from './dto/create-chat-session.dto';
import { UpdateChatSessionDto } from './dto/update-chat-session.dto';
import { AddMessageDto } from './dto/add-message.dto';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('chat')
@Controller('chat')
@UseGuards(ClerkAuthGuard)
@ApiBearerAuth()
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new chat session' })
  @ApiResponse({ status: 201, description: 'Chat session successfully created' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async create(
    @Body() createChatSessionDto: CreateChatSessionDto,
    @CurrentUser() user: { clerkId: string },
  ) {
    return this.chatService.create({
      ...createChatSessionDto,
      userId: user.clerkId,
    });
  }

  @Get('user')
  @ApiOperation({ summary: 'Get all chat sessions for the authenticated user' })
  @ApiResponse({ status: 200, description: 'List of chat sessions' })
  async findAllByUserId(@CurrentUser() user: { clerkId: string }) {
    return this.chatService.findAllByUserId(user.clerkId);
  }

  @Get('session/:sessionId')
  @ApiOperation({ summary: 'Get a chat session by session ID' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({ status: 200, description: 'Chat session found' })
  @ApiResponse({ status: 404, description: 'Chat session not found' })
  async findBySessionId(@Param('sessionId') sessionId: string) {
    const session = await this.chatService.findBySessionId(sessionId);
    if (!session) {
      throw new NotFoundException(
        `Chat session with sessionId ${sessionId} not found`,
      );
    }
    return session;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a chat session by ID' })
  @ApiParam({ name: 'id', description: 'Chat session ID' })
  @ApiResponse({ status: 200, description: 'Chat session found' })
  @ApiResponse({ status: 404, description: 'Chat session not found' })
  async findOne(@Param('id') id: string) {
    return this.chatService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a chat session' })
  @ApiParam({ name: 'id', description: 'Chat session ID' })
  @ApiResponse({ status: 200, description: 'Chat session successfully updated' })
  @ApiResponse({ status: 404, description: 'Chat session not found' })
  async update(
    @Param('id') id: string,
    @Body() updateChatSessionDto: UpdateChatSessionDto,
  ) {
    return this.chatService.update(id, updateChatSessionDto);
  }

  @Post(':sessionId/message')
  @ApiOperation({ summary: 'Add a message to a chat session' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({ status: 200, description: 'Message successfully added' })
  @ApiResponse({ status: 404, description: 'Chat session not found' })
  async addMessage(
    @Param('sessionId') sessionId: string,
    @Body() addMessageDto: AddMessageDto,
  ) {
    return this.chatService.addMessage(sessionId, addMessageDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a chat session' })
  @ApiParam({ name: 'id', description: 'Chat session ID' })
  @ApiResponse({ status: 204, description: 'Chat session successfully deleted' })
  @ApiResponse({ status: 404, description: 'Chat session not found' })
  async remove(@Param('id') id: string) {
    return this.chatService.remove(id);
  }
}

