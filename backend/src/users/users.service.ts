import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const createdUser = new this.userModel(createUserDto);
    return createdUser.save();
  }

  async findAll(): Promise<User[]> {
    return this.userModel.find().exec();
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userModel.findById(id).exec();
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ email: email.toLowerCase() }).exec();
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const updatedUser = await this.userModel
      .findByIdAndUpdate(id, updateUserDto, { new: true })
      .exec();
    if (!updatedUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return updatedUser;
  }

  async remove(id: string): Promise<void> {
    const result = await this.userModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
  }

  // Clerk-based methods
  async findByClerkId(clerkId: string): Promise<User | null> {
    const user = await this.userModel.findOne({ clerkId }).exec();
    return user;
  }

  async getSettingsByClerkId(clerkId: string): Promise<User['settings']> {
    // Use findByClerkId which will auto-create user if needed
    const user = await this.findByClerkId(clerkId);
    if (!user) {
      throw new NotFoundException(`User with Clerk ID ${clerkId} not found`);
    }
    return user.settings;
  }

  async updateSettingsByClerkId(clerkId: string, updateSettingsDto: UpdateSettingsDto): Promise<User['settings']> {
    // Ensure user exists first (will auto-create if needed)
    const existingUser = await this.findByClerkId(clerkId);
    if (!existingUser) {
      throw new NotFoundException(`User with Clerk ID ${clerkId} not found`);
    }
    
    // Merge new settings with existing settings to avoid overwriting unrelated fields
    const updatedSettings = {
      ...existingUser.settings,
      ...updateSettingsDto,
    };
    
    const user = await this.userModel
      .findOneAndUpdate(
        { clerkId },
        { $set: { 'settings': updatedSettings } },
        { new: true, runValidators: true }
      )
      .select('settings')
      .exec();
    
    if (!user) {
      throw new NotFoundException(`User with Clerk ID ${clerkId} not found`);
    }
    
    return user.settings;
  }

  // Settings-specific methods (by ID)
  async getSettings(id: string): Promise<User['settings']> {
    const user = await this.userModel.findById(id).select('settings').exec();
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user.settings;
  }

  async updateSettings(id: string, updateSettingsDto: UpdateSettingsDto): Promise<User['settings']> {
    // First get the existing user to merge settings properly
    const existingUser = await this.findOne(id);
    
    // Merge new settings with existing settings to avoid overwriting unrelated fields
    const updatedSettings = {
      ...existingUser.settings,
      ...updateSettingsDto,
    };
    
    const user = await this.userModel
      .findByIdAndUpdate(
        id,
        { $set: { 'settings': updatedSettings } },
        { new: true, runValidators: true }
      )
      .select('settings')
      .exec();
    
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    
    return user.settings;
  }
}

