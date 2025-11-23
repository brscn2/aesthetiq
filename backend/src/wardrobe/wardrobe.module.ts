import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WardrobeService } from './wardrobe.service';
import { WardrobeController } from './wardrobe.controller';
import { WardrobeItem, WardrobeItemSchema } from './schemas/wardrobe-item.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WardrobeItem.name, schema: WardrobeItemSchema },
    ]),
  ],
  controllers: [WardrobeController],
  providers: [WardrobeService],
  exports: [WardrobeService],
})
export class WardrobeModule {}

