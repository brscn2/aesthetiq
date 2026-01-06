import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class RemoveBackgroundDto {
  @ApiProperty({
    description: 'Base64 encoded image data',
    example: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
  })
  @IsString()
  @IsNotEmpty()
  imageBase64: string;
}

export class RemoveBackgroundResponse {
  @ApiProperty({ description: 'Whether the operation was successful' })
  success: boolean;

  @ApiProperty({ description: 'Processed image as base64 with transparent background', required: false })
  data?: string;

  @ApiProperty({ description: 'Error message if operation failed', required: false })
  error?: string;
}
