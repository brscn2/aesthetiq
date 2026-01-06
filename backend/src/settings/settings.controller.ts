import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { UpdateSystemSettingsDto } from './dto/update-settings.dto';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { AdminGuard } from '../admin/guards/admin.guard';

@Controller('admin/settings')
@UseGuards(ClerkAuthGuard, AdminGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  async getSettings() {
    return this.settingsService.getSettings();
  }

  @Patch()
  async updateSettings(@Body() updateDto: UpdateSystemSettingsDto) {
    return this.settingsService.updateSettings(updateDto);
  }

  @Get('system-info')
  async getSystemInfo() {
    return this.settingsService.getSystemInfo();
  }
}
