import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TryonController } from './tryon.controller';
import { TryonService } from './tryon.service';
import { User, UserSchema } from '../users/schemas/user.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: User.name, schema: UserSchema }])],
  controllers: [TryonController],
  providers: [TryonService],
  exports: [TryonService],
})
export class TryonModule {}
