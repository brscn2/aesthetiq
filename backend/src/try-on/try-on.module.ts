import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TryOnController } from './try-on.controller';
import { TryOnService } from './try-on.service';

@Module({
  imports: [HttpModule],
  controllers: [TryOnController],
  providers: [TryOnService],
  exports: [TryOnService],
})
export class TryOnModule {}
