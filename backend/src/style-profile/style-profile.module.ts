import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StyleProfileService } from './style-profile.service';
import { StyleProfileController } from './style-profile.controller';
import {
  StyleProfile,
  StyleProfileSchema,
} from './schemas/style-profile.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: StyleProfile.name, schema: StyleProfileSchema },
    ]),
  ],
  controllers: [StyleProfileController],
  providers: [StyleProfileService],
  exports: [StyleProfileService],
})
export class StyleProfileModule {}

