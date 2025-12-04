import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  StyleProfile,
  StyleProfileDocument,
} from './schemas/style-profile.schema';
import { CreateStyleProfileDto } from './dto/create-style-profile.dto';
import { UpdateStyleProfileDto } from './dto/update-style-profile.dto';

@Injectable()
export class StyleProfileService {
  constructor(
    @InjectModel(StyleProfile.name)
    private styleProfileModel: Model<StyleProfileDocument>,
  ) {}

  async create(
    createStyleProfileDto: CreateStyleProfileDto & { userId: string },
  ): Promise<StyleProfile> {
    const createdProfile = new this.styleProfileModel(createStyleProfileDto);
    return createdProfile.save();
  }

  async findByUserId(userId: string): Promise<StyleProfile | null> {
    return this.styleProfileModel.findOne({ userId }).exec();
  }

  async findOne(id: string): Promise<StyleProfile> {
    const profile = await this.styleProfileModel.findById(id).exec();
    if (!profile) {
      throw new NotFoundException(`Style profile with ID ${id} not found`);
    }
    return profile;
  }

  async update(
    id: string,
    updateStyleProfileDto: UpdateStyleProfileDto,
  ): Promise<StyleProfile> {
    const updatedProfile = await this.styleProfileModel
      .findByIdAndUpdate(id, updateStyleProfileDto, { new: true })
      .exec();
    if (!updatedProfile) {
      throw new NotFoundException(`Style profile with ID ${id} not found`);
    }
    return updatedProfile;
  }

  async updateByUserId(
    userId: string,
    updateStyleProfileDto: UpdateStyleProfileDto,
  ): Promise<StyleProfile> {
    const updatedProfile = await this.styleProfileModel
      .findOneAndUpdate({ userId }, updateStyleProfileDto, {
        new: true,
        upsert: true,
      })
      .exec();
    return updatedProfile;
  }

  async remove(id: string): Promise<void> {
    const result = await this.styleProfileModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Style profile with ID ${id} not found`);
    }
  }
}

