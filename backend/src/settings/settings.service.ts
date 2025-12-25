import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SystemSettings, SystemSettingsDocument } from './schemas/system-settings.schema';
import { UpdateSystemSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(
    @InjectModel(SystemSettings.name)
    private settingsModel: Model<SystemSettingsDocument>,
  ) {}

  async getSettings(): Promise<SystemSettings> {
    // Get the single settings document, or create default if none exists
    let settings = await this.settingsModel.findOne().exec();
    
    if (!settings) {
      this.logger.log('No settings found, creating default settings');
      settings = await this.settingsModel.create({});
    }
    
    return settings;
  }

  async updateSettings(updateDto: UpdateSystemSettingsDto): Promise<SystemSettings> {
    // Find and update, or create if doesn't exist
    const settings = await this.settingsModel.findOneAndUpdate(
      {},
      { $set: updateDto },
      { new: true, upsert: true },
    ).exec();
    
    this.logger.log('Settings updated successfully');
    return settings;
  }

  async getSystemInfo(): Promise<{
    version: string;
    environment: string;
    apiStatus: string;
    lastDeployment: string;
  }> {
    return {
      version: process.env.APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      apiStatus: 'healthy',
      lastDeployment: new Date().toISOString(),
    };
  }
}
