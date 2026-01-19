import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  WardrobeItem,
  WardrobeItemDocument,
  Category,
} from './schemas/wardrobe-item.schema';
import { CreateWardrobeItemDto } from './dto/create-wardrobe-item.dto';
import { UpdateWardrobeItemDto } from './dto/update-wardrobe-item.dto';
import { AzureStorageService } from '../upload/azure-storage.service';
import { calculateSeasonalPaletteScores } from '../common/seasonal-colors';
import { EmbeddingService } from '../ai/embedding.service';

@Injectable()
export class WardrobeService {
  private readonly logger = new Logger(WardrobeService.name);

  constructor(
    @InjectModel(WardrobeItem.name)
    private wardrobeItemModel: Model<WardrobeItemDocument>,
    private azureStorageService: AzureStorageService,
    private embeddingService: EmbeddingService,
  ) {}

  async create(createWardrobeItemDto: CreateWardrobeItemDto & { userId: string }): Promise<WardrobeItem> {
    // Calculate seasonal palette scores based on item colors
    const seasonalPaletteScores = createWardrobeItemDto.colors?.length
      ? calculateSeasonalPaletteScores(createWardrobeItemDto.colors)
      : null;

    // Get image embedding from Python service (non-blocking, fails gracefully)
    const imageUrl = createWardrobeItemDto.processedImageUrl || createWardrobeItemDto.imageUrl;
    let embedding: number[] | null = null;
    
    try {
      this.logger.log(`Fetching CLIP embedding for image: ${imageUrl}`);
      embedding = await this.embeddingService.getImageEmbedding(imageUrl);
      if (embedding) {
        this.logger.log(`Embedding generated (${embedding.length} dimensions)`);
      }
    } catch (error) {
      this.logger.warn(`Failed to get embedding, continuing without: ${error.message}`);
    }

    // Convert retailerId string to ObjectId if provided
    const itemData = {
      ...createWardrobeItemDto,
      retailerId: createWardrobeItemDto.retailerId ? new Types.ObjectId(createWardrobeItemDto.retailerId) : undefined,
      seasonalPaletteScores,
      embedding,
    };
    
    this.logger.log(`Creating wardrobe item with seasonal palette scores${embedding ? ' and embedding' : ''}`);
    const createdItem = new this.wardrobeItemModel(itemData);
    return createdItem.save();
  }

  async findAll(
    userId: string,
    category?: Category,
    colorHex?: string,
    retailerId?: string,
    search?: string,
    seasonalPalette?: string,
    minPaletteScore?: number,
  ): Promise<WardrobeItem[]> {
    const filter: any = { userId };
    if (category) {
      filter.category = category;
    }
    if (colorHex) {
      filter.colorHex = colorHex;
    }
    if (retailerId) {
      filter.retailerId = new Types.ObjectId(retailerId);
    }
    if (search && search.trim()) {
      const searchRegex = { $regex: search.trim(), $options: 'i' };
      filter.$or = [
        { brand: searchRegex },
        { subCategory: searchRegex },
        { notes: searchRegex },
      ];
    }
    
    // Filter by seasonal palette score
    if (seasonalPalette) {
      const threshold = minPaletteScore ?? 0.6;
      const paletteKey = `seasonalPaletteScores.${seasonalPalette}`;
      filter[paletteKey] = { $gte: threshold };
    }
    
    return this.wardrobeItemModel.find(filter).populate('retailerId').exec();
  }

  async findAllWithRetailers(
    userId: string,
    category?: Category,
    colorHex?: string,
    retailerId?: string,
  ): Promise<WardrobeItem[]> {
    const filter: any = {};
    // Only filter by userId if provided and not empty
    if (userId && userId.trim() !== '') {
      filter.userId = userId;
    }
    if (category) {
      filter.category = category;
    }
    if (colorHex) {
      filter.colorHex = colorHex;
    }
    if (retailerId) {
      filter.retailerId = new Types.ObjectId(retailerId);
    }
    return this.wardrobeItemModel.find(filter).populate('retailerId').exec();
  }

  async findOne(id: string): Promise<WardrobeItem> {
    const item = await this.wardrobeItemModel.findById(id).populate('retailerId').exec();
    if (!item) {
      throw new NotFoundException(`Wardrobe item with ID ${id} not found`);
    }
    return item;
  }

  async findByRetailerId(retailerId: string): Promise<WardrobeItem[]> {
    return this.wardrobeItemModel.find({ retailerId: new Types.ObjectId(retailerId) }).populate('retailerId').exec();
  }

  async update(
    id: string,
    updateWardrobeItemDto: UpdateWardrobeItemDto,
  ): Promise<{ updated: WardrobeItem; oldData: WardrobeItem }> {
    // Get the old data first for audit logging
    const oldItem = await this.wardrobeItemModel.findById(id).populate('retailerId').exec();
    if (!oldItem) {
      throw new NotFoundException(`Wardrobe item with ID ${id} not found`);
    }

    // Recalculate seasonal palette scores if colors are being updated
    const seasonalPaletteScores = updateWardrobeItemDto.colors?.length
      ? calculateSeasonalPaletteScores(updateWardrobeItemDto.colors)
      : null;

    // Convert retailerId string to ObjectId if provided
    const updateData: any = {
      ...updateWardrobeItemDto,
      retailerId: updateWardrobeItemDto.retailerId ? new Types.ObjectId(updateWardrobeItemDto.retailerId) : undefined,
    };

    // Only update palette scores if colors were provided
    if (seasonalPaletteScores) {
      updateData.seasonalPaletteScores = seasonalPaletteScores;
      this.logger.log(`Recalculating seasonal palette scores for item ${id}`);
    }
    
    const updatedItem = await this.wardrobeItemModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('retailerId')
      .exec();
    
    if (!updatedItem) {
      throw new NotFoundException(`Wardrobe item with ID ${id} not found`);
    }
    
    return { updated: updatedItem, oldData: oldItem };
  }

  async remove(id: string): Promise<WardrobeItem> {
    // Find the item first to get the image URL and return it for audit logging
    const item = await this.wardrobeItemModel.findById(id).populate('retailerId').exec();
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
    
    return item;
  }
}

