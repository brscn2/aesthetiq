import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Body,
  Res,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { TryonService } from './tryon.service';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';

@Controller('tryon')
@UseGuards(ClerkAuthGuard)
export class TryonController {
  constructor(private readonly tryonService: TryonService) {}

  @Post('try-on')
  @UseInterceptors(FileInterceptor('avatar_image'))
  async tryOn(
    @Request() req: any,
    @UploadedFile() avatarImage: Express.Multer.File,
    @Body('clothing_image_url') clothingImageUrl: string,
    @Body('use_saved_avatar') useSavedAvatar: string,
    @Res() res: Response,
  ) {
    try {
      const useSaved = useSavedAvatar === 'true';
      
      if (!useSaved && !avatarImage) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          message: 'Avatar image is required',
        });
      }

      if (!clothingImageUrl) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          message: 'Clothing image URL is required',
        });
      }

      const resultImage = await this.tryonService.tryOnWithFile(
        req.user.clerkId,
        clothingImageUrl,
        useSaved ? null : avatarImage.buffer,
        useSaved,
      );

      res.set({
        'Content-Type': 'image/jpeg',
        'Content-Length': resultImage.length,
      });

      return res.send(resultImage);
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Try-on failed';
      const statusCode = error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR;
      
      return res.status(statusCode).json({
        message: errorMessage,
        error: error.message,
      });
    }
  }
}
