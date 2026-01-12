import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OutfitService } from './outfit.service';
import { OutfitController } from './outfit.controller';
import { Outfit, OutfitSchema } from './schemas/outfit.schema';
import {
  WardrobeItem,
  WardrobeItemSchema,
} from '../wardrobe/schemas/wardrobe-item.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Outfit.name, schema: OutfitSchema },
      { name: WardrobeItem.name, schema: WardrobeItemSchema },
    ]),
  ],
  controllers: [OutfitController],
  providers: [OutfitService],
  exports: [OutfitService],
})
export class OutfitModule {}
