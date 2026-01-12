import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';

export class SendMessageDto {
  @ApiProperty({ example: 'I need a jacket for a job interview' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({ required: false, example: 'optional-session-id' })
  @IsString()
  @IsOptional()
  sessionId?: string;

  @ApiProperty({ required: false, type: Object })
  @IsObject()
  @IsOptional()
  context?: Record<string, any>;
}
