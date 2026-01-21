import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ChatRequestDto {
  @ApiPropertyOptional({
    description: 'Session ID for continuing an existing conversation',
    example: 'session_abc123',
  })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiProperty({
    description: 'User message to the AI stylist',
    example: 'I need a jacket for a job interview',
    minLength: 1,
    maxLength: 10000,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  message: string;
}
