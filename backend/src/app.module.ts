import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AnalysisModule } from './analysis/analysis.module';
import { StyleProfileModule } from './style-profile/style-profile.module';
import { WardrobeModule } from './wardrobe/wardrobe.module';
import { ChatModule } from './chat/chat.module';
import { UploadModule } from './upload/upload.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { AdminModule } from './admin/admin.module';
import { BrandsModule } from './brands/brands.module';
import { AuditModule } from './audit/audit.module';
import databaseConfig from './config/database.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('database.uri'),
      }),
      inject: [ConfigService],
    }),
    UsersModule,
    AnalysisModule,
    StyleProfileModule,
    WardrobeModule,
    ChatModule,
    UploadModule,
    WebhooksModule,
    AdminModule,
    BrandsModule,
    AuditModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
