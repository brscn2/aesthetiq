import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, isValidObjectId } from 'mongoose';
import {
  CommerceItem,
  CommerceItemDocument,
  Category,
} from './schemas/commerce-item.schema';
import {
  ScrapedCommerceItem,
  ScrapedCommerceItemDocument,
} from './schemas/scraped-commerce-item.schema';
import { CreateCommerceItemDto } from './dto/create-commerce-item.dto';
import { UpdateCommerceItemDto } from './dto/update-commerce-item.dto';
import { SearchCommerceItemsDto } from './dto/search-commerce-items.dto';
import { FindStyleItemsDto } from './dto/find-style-items.dto';
import { calculateSeasonalPaletteScores } from '../common/seasonal-colors';
import { EmbeddingService } from '../ai/embedding.service';
import {
  ResourceNotFoundException,
  DuplicateResourceException,
} from '../common/exceptions/admin.exceptions';

@Injectable()
export class CommerceService {
  private readonly logger = new Logger(CommerceService.name);

  constructor(
    @InjectModel(CommerceItem.name)
    private commerceItemModel: Model<CommerceItemDocument>,
    @InjectModel(ScrapedCommerceItem.name)
    private scrapedCommerceItemModel: Model<ScrapedCommerceItemDocument>,
    private embeddingService: EmbeddingService,
  ) {}

  async create(
    createCommerceItemDto: CreateCommerceItemDto,
  ): Promise<CommerceItem> {
    try {
      // Calculate seasonal palette scores based on item colors
      const seasonalPaletteScores = createCommerceItemDto.colors?.length
        ? calculateSeasonalPaletteScores(createCommerceItemDto.colors)
        : null;

      // Get image embedding from Python service (non-blocking, fails gracefully)
      let embedding: number[] | null = null;
      try {
        this.logger.log(
          `Fetching CLIP embedding for image: ${createCommerceItemDto.imageUrl}`,
        );
        embedding = await this.embeddingService.getImageEmbedding(
          createCommerceItemDto.imageUrl,
        );
        if (embedding) {
          this.logger.log(`Embedding generated (${embedding.length} dimensions)`);
        }
      } catch (error) {
        this.logger.warn(
          `Failed to get embedding, continuing without: ${error.message}`,
        );
      }

      const itemData = {
        ...createCommerceItemDto,
        retailerId: new Types.ObjectId(createCommerceItemDto.retailerId),
        brandId: createCommerceItemDto.brandId
          ? new Types.ObjectId(createCommerceItemDto.brandId)
          : undefined,
        seasonalPaletteScores,
        embedding,
      };

      this.logger.log(
        `Creating commerce item with seasonal palette scores${embedding ? ' and embedding' : ''}`,
      );
      const createdItem = new this.commerceItemModel(itemData);
      return createdItem.save();
    } catch (error) {
      if (error.code === 11000) {
        throw new DuplicateResourceException(
          'CommerceItem',
          'sku',
          createCommerceItemDto.sku || 'unknown',
        );
      }
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Failed to create commerce item: ${error.message}`);
      throw new InternalServerErrorException('Failed to create commerce item');
    }
  }

  async createBulk(
    items: CreateCommerceItemDto[],
  ): Promise<{ created: number; errors: { index: number; error: string }[] }> {
    const results = { created: 0, errors: [] as { index: number; error: string }[] };

    for (let i = 0; i < items.length; i++) {
      try {
        await this.create(items[i]);
        results.created++;
      } catch (error) {
        results.errors.push({
          index: i,
          error: error.message || 'Unknown error',
        });
      }
    }

    this.logger.log(
      `Bulk create completed: ${results.created} created, ${results.errors.length} errors`,
    );
    return results;
  }

  async findAll(
    searchDto: SearchCommerceItemsDto = {},
  ): Promise<{ items: CommerceItem[]; total: number }> {
    try {
      const {
        search,
        category,
        brandId,
        retailerId,
        color,
        priceMin,
        priceMax,
        tags,
        inStock,
        seasonalPalette,
        minPaletteScore,
        limit = 20,
        offset = 0,
      } = searchDto;

      if (limit < 1 || limit > 100) {
        throw new BadRequestException('Limit must be between 1 and 100');
      }
      if (offset < 0) {
        throw new BadRequestException('Offset must be non-negative');
      }

      const filter: any = {};

      if (search) {
        filter.$text = { $search: search };
      }

      if (category) {
        filter.category = category;
      }

      if (brandId) {
        if (!isValidObjectId(brandId)) {
          throw new BadRequestException('Invalid brand ID format');
        }
        filter.brandId = new Types.ObjectId(brandId);
      }

      if (retailerId) {
        if (!isValidObjectId(retailerId)) {
          throw new BadRequestException('Invalid retailer ID format');
        }
        filter.retailerId = new Types.ObjectId(retailerId);
      }

      if (color) {
        filter.colors = color;
      }

      if (priceMin !== undefined || priceMax !== undefined) {
        filter.price = {};
        if (priceMin !== undefined) {
          filter.price.$gte = priceMin;
        }
        if (priceMax !== undefined) {
          filter.price.$lte = priceMax;
        }
      }

      if (tags && tags.length > 0) {
        filter.tags = { $all: tags };
      }

      if (inStock !== undefined) {
        filter.inStock = inStock;
      }

      if (seasonalPalette) {
        const threshold = minPaletteScore ?? 0.6;
        const paletteKey = `seasonalPaletteScores.${seasonalPalette}`;
        filter[paletteKey] = { $gte: threshold };
      }

      const [items, total] = await Promise.all([
        this.commerceItemModel
          .find(filter)
          .populate('brandId')
          .populate('retailerId')
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip(offset)
          .exec(),
        this.commerceItemModel.countDocuments(filter).exec(),
      ]);

      return { items, total };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Failed to retrieve commerce items: ${error.message}`);
      throw new InternalServerErrorException(
        'Failed to retrieve commerce items',
      );
    }
  }

  async findOne(id: string): Promise<CommerceItem> {
    try {
      if (!isValidObjectId(id)) {
        throw new BadRequestException('Invalid commerce item ID format');
      }

      const item = await this.commerceItemModel
        .findById(id)
        .populate('brandId')
        .populate('retailerId')
        .exec();

      if (!item) {
        throw new ResourceNotFoundException('CommerceItem', id);
      }
      return item;
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ResourceNotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Failed to retrieve commerce item',
      );
    }
  }

  async findByRetailerId(retailerId: string): Promise<CommerceItem[]> {
    if (!isValidObjectId(retailerId)) {
      throw new BadRequestException('Invalid retailer ID format');
    }
    return this.commerceItemModel
      .find({ retailerId: new Types.ObjectId(retailerId) })
      .populate('brandId')
      .populate('retailerId')
      .exec();
  }

  async findBySku(sku: string, retailerId: string): Promise<CommerceItem | null> {
    if (!isValidObjectId(retailerId)) {
      throw new BadRequestException('Invalid retailer ID format');
    }
    return this.commerceItemModel
      .findOne({ sku, retailerId: new Types.ObjectId(retailerId) })
      .populate('brandId')
      .populate('retailerId')
      .exec();
  }

  async update(
    id: string,
    updateCommerceItemDto: UpdateCommerceItemDto,
  ): Promise<{ updated: CommerceItem; oldData: CommerceItem }> {
    try {
      if (!isValidObjectId(id)) {
        throw new BadRequestException('Invalid commerce item ID format');
      }

      const oldItem = await this.commerceItemModel
        .findById(id)
        .populate('brandId')
        .populate('retailerId')
        .exec();
      if (!oldItem) {
        throw new ResourceNotFoundException('CommerceItem', id);
      }

      // Recalculate seasonal palette scores if colors are being updated
      const seasonalPaletteScores = updateCommerceItemDto.colors?.length
        ? calculateSeasonalPaletteScores(updateCommerceItemDto.colors)
        : null;

      const updateData: any = {
        ...updateCommerceItemDto,
        retailerId: updateCommerceItemDto.retailerId
          ? new Types.ObjectId(updateCommerceItemDto.retailerId)
          : undefined,
        brandId: updateCommerceItemDto.brandId
          ? new Types.ObjectId(updateCommerceItemDto.brandId)
          : undefined,
      };

      // Only update palette scores if colors were provided
      if (seasonalPaletteScores) {
        updateData.seasonalPaletteScores = seasonalPaletteScores;
        this.logger.log(`Recalculating seasonal palette scores for item ${id}`);
      }

      // Regenerate embedding if image URL changed
      if (updateCommerceItemDto.imageUrl && updateCommerceItemDto.imageUrl !== oldItem.imageUrl) {
        try {
          const embedding = await this.embeddingService.getImageEmbedding(
            updateCommerceItemDto.imageUrl,
          );
          if (embedding) {
            updateData.embedding = embedding;
            this.logger.log(`Regenerated embedding for item ${id}`);
          }
        } catch (error) {
          this.logger.warn(`Failed to regenerate embedding: ${error.message}`);
        }
      }

      const updatedItem = await this.commerceItemModel
        .findByIdAndUpdate(id, updateData, { new: true, runValidators: true })
        .populate('brandId')
        .populate('retailerId')
        .exec();

      if (!updatedItem) {
        throw new ResourceNotFoundException('CommerceItem', id);
      }

      return { updated: updatedItem, oldData: oldItem };
    } catch (error) {
      if (error.code === 11000) {
        throw new DuplicateResourceException(
          'CommerceItem',
          'sku',
          updateCommerceItemDto.sku || 'unknown',
        );
      }
      if (
        error instanceof BadRequestException ||
        error instanceof ResourceNotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to update commerce item');
    }
  }

  async remove(id: string): Promise<CommerceItem> {
    try {
      if (!isValidObjectId(id)) {
        throw new BadRequestException('Invalid commerce item ID format');
      }

      const result = await this.commerceItemModel
        .findByIdAndDelete(id)
        .populate('brandId')
        .populate('retailerId')
        .exec();
      if (!result) {
        throw new ResourceNotFoundException('CommerceItem', id);
      }
      return result;
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ResourceNotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to delete commerce item');
    }
  }

  async getStats(): Promise<{
    totalItems: number;
    inStockItems: number;
    itemsByCategory: { category: string; count: number }[];
    itemsByRetailer: { retailerId: string; retailerName: string; count: number }[];
    itemsByBrand: { brand: string; count: number }[];
  }> {
    try {
      const [totalItems, inStockItems, itemsByCategory, itemsByRetailer, itemsByBrand] =
        await Promise.all([
          this.commerceItemModel.countDocuments().exec(),
          this.commerceItemModel.countDocuments({ inStock: true }).exec(),
          this.commerceItemModel
            .aggregate([
              { $group: { _id: '$category', count: { $sum: 1 } } },
              { $sort: { count: -1 } },
              { $project: { category: '$_id', count: 1, _id: 0 } },
            ])
            .exec(),
          this.commerceItemModel
            .aggregate([
              {
                $lookup: {
                  from: 'retailers',
                  localField: 'retailerId',
                  foreignField: '_id',
                  as: 'retailer',
                },
              },
              { $unwind: '$retailer' },
              {
                $group: {
                  _id: '$retailerId',
                  retailerName: { $first: '$retailer.name' },
                  count: { $sum: 1 },
                },
              },
              { $sort: { count: -1 } },
              { $limit: 10 },
              {
                $project: {
                  retailerId: { $toString: '$_id' },
                  retailerName: 1,
                  count: 1,
                  _id: 0,
                },
              },
            ])
            .exec(),
          this.commerceItemModel
            .aggregate([
              { $match: { brand: { $exists: true, $ne: null } } },
              { $group: { _id: '$brand', count: { $sum: 1 } } },
              { $sort: { count: -1 } },
              { $limit: 10 },
              { $project: { brand: '$_id', count: 1, _id: 0 } },
            ])
            .exec(),
        ]);

      return {
        totalItems,
        inStockItems,
        itemsByCategory,
        itemsByRetailer,
        itemsByBrand,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to retrieve commerce statistics',
      );
    }
  }

  /**
   * Find style items from scraped commerce collection
   */
  async findStyleItems(
    findStyleDto: FindStyleItemsDto,
  ): Promise<{ items: ScrapedCommerceItem[]; total: number; page: number; limit: number }> {
    try {
      const { page = 1, limit = 50, brand, category, gender, store } = findStyleDto;
      const skip = (page - 1) * limit;

      this.logger.log(`Finding style items: page=${page}, limit=${limit}, brand=${brand}, category=${category}, gender=${gender}, store=${store}`);

      // Build filter query
      const filter: any = { isActive: true };
      
      if (brand) {
        filter.brand = brand;
      }
      if (category) {
        filter.category = category;
      }
      if (gender) {
        filter.gender = gender;
      }
      if (store) {
        filter.store = store;
      }

      this.logger.log(`Filter query: ${JSON.stringify(filter)}`);

      const [items, total] = await Promise.all([
        this.scrapedCommerceItemModel
          .find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean()
          .exec(),
        this.scrapedCommerceItemModel.countDocuments(filter).exec(),
      ]);

      this.logger.log(`Found ${items.length} items out of ${total} total`);

      return {
        items: items as ScrapedCommerceItem[],
        total,
        page,
        limit,
      };
    } catch (error) {
      this.logger.error(`Failed to find style items: ${error.message}`);
      throw new InternalServerErrorException('Failed to retrieve style items');
    }
  }
}
