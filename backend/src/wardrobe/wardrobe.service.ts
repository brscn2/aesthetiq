import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  WardrobeItem,
  WardrobeItemDocument,
  Category,
} from './schemas/wardrobe-item.schema';
import { CreateWardrobeItemDto } from './dto/create-wardrobe-item.dto';
import { UpdateWardrobeItemDto } from './dto/update-wardrobe-item.dto';
import { AzureStorageService } from '../upload/azure-storage.service';

@Injectable()
export class WardrobeService {
  private readonly logger = new Logger(WardrobeService.name);

  constructor(
    @InjectModel(WardrobeItem.name)
    private wardrobeItemModel: Model<WardrobeItemDocument>,
    private azureStorageService: AzureStorageService,
  ) {}

  async create(createWardrobeItemDto: CreateWardrobeItemDto & { userId: string }): Promise<WardrobeItem> {
    const createdItem = new this.wardrobeItemModel(createWardrobeItemDto);
    return createdItem.save();
  }

  async findAll(
    userId: string,
    category?: Category,
    colorHex?: string,
  ): Promise<WardrobeItem[]> {
    const filter: any = { userId };
    if (category) {
      filter.category = category;
    }
    if (colorHex) {
      filter.colorHex = colorHex;
    }
    return this.wardrobeItemModel.find(filter).exec();
  }

  async findOne(id: string): Promise<WardrobeItem> {
    const item = await this.wardrobeItemModel.findById(id).exec();
    if (!item) {
      throw new NotFoundException(`Wardrobe item with ID ${id} not found`);
    }
    return item;
  }

  async update(
    id: string,
    updateWardrobeItemDto: UpdateWardrobeItemDto,
  ): Promise<WardrobeItem> {
    const updatedItem = await this.wardrobeItemModel
      .findByIdAndUpdate(id, updateWardrobeItemDto, { new: true })
      .exec();
    if (!updatedItem) {
      throw new NotFoundException(`Wardrobe item with ID ${id} not found`);
    }
    return updatedItem;
  }

  async remove(id: string): Promise<void> {
    // Find the item first to get the image URL
    const item = await this.wardrobeItemModel.findById(id).exec();
    if (!item) {
      throw new NotFoundException(`Wardrobe item with ID ${id} not found`);
    }

    this.logger.log(`Deleting wardrobe item ${id} and associated image`);

    // Delete the image from Azure Blob Storage
    if (item.imageUrl) {
      try {
        await this.azureStorageService.deleteImage(item.imageUrl);
      } catch (error) {
        // Log error but don't fail the deletion
        this.logger.error(`Failed to delete image for item ${id}: ${error.message}`);
      }
    }

    // Delete the processed image if it exists
    if (item.processedImageUrl && item.processedImageUrl !== item.imageUrl) {
      try {
        await this.azureStorageService.deleteImage(item.processedImageUrl);
      } catch (error) {
        this.logger.error(`Failed to delete processed image for item ${id}: ${error.message}`);
      }
    }

    // Delete the database record
    await this.wardrobeItemModel.findByIdAndDelete(id).exec();
    
    this.logger.log(`Wardrobe item ${id} deleted successfully`);
  }
}

