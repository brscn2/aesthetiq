import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OutfitService } from './outfit.service';
import { OutfitController } from './outfit.controller';
import { Outfit, OutfitSchema } from './schemas/outfit.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Outfit.name, schema: OutfitSchema }]),
  ],
  controllers: [OutfitController],
  providers: [OutfitService],
  exports: [OutfitService],
})
export class OutfitModule {}
