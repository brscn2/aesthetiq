import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import { Retailer, RetailerDocument } from './schemas/retailer.schema';
import { CreateRetailerDto } from './dto/create-retailer.dto';
import { UpdateRetailerDto } from './dto/update-retailer.dto';
import {
  ResourceNotFoundException,
  DuplicateResourceException,
} from '../common/exceptions/admin.exceptions';

export interface RetailerSearchOptions {
  search?: string;
  country?: string;
  isActive?: boolean;
  limit?: number;
  offset?: number;
}

@Injectable()
export class RetailerService {
  constructor(
    @InjectModel(Retailer.name) private retailerModel: Model<RetailerDocument>,
  ) {}

  async create(createRetailerDto: CreateRetailerDto): Promise<Retailer> {
    try {
      if (!createRetailerDto.name?.trim()) {
        throw new BadRequestException(
          'Retailer name is required and cannot be empty',
        );
      }

      const createdRetailer = new this.retailerModel(createRetailerDto);
      return await createdRetailer.save();
    } catch (error) {
      if (error.code === 11000) {
        throw new DuplicateResourceException(
          'Retailer',
          'name',
          createRetailerDto.name,
        );
      }
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to create retailer');
    }
  }

  async findAll(
    options: RetailerSearchOptions = {},
  ): Promise<{ retailers: Retailer[]; total: number }> {
    try {
      const { search, country, isActive, limit = 50, offset = 0 } = options;

      if (limit < 1 || limit > 100) {
        throw new BadRequestException('Limit must be between 1 and 100');
      }
      if (offset < 0) {
        throw new BadRequestException('Offset must be non-negative');
      }

      const query: any = {};

      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
        ];
      }

      if (country) {
        query.country = { $regex: country, $options: 'i' };
      }

      if (isActive !== undefined) {
        query.isActive = isActive;
      }

      const [retailers, total] = await Promise.all([
        this.retailerModel
          .find(query)
          .sort({ name: 1 })
          .limit(limit)
          .skip(offset)
          .exec(),
        this.retailerModel.countDocuments(query).exec(),
      ]);

      return { retailers, total };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to retrieve retailers');
    }
  }

  async findOne(id: string): Promise<Retailer> {
    try {
      if (!isValidObjectId(id)) {
        throw new BadRequestException('Invalid retailer ID format');
      }

      const retailer = await this.retailerModel.findById(id).exec();
      if (!retailer) {
        throw new ResourceNotFoundException('Retailer', id);
      }
      return retailer;
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ResourceNotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to retrieve retailer');
    }
  }

  async findByName(name: string): Promise<Retailer | null> {
    return this.retailerModel
      .findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } })
      .exec();
  }

  async findActiveRetailers(): Promise<Retailer[]> {
    return this.retailerModel.find({ isActive: true }).sort({ name: 1 }).exec();
  }

  async update(
    id: string,
    updateRetailerDto: UpdateRetailerDto,
  ): Promise<{ updated: Retailer; oldData: Retailer }> {
    try {
      if (!isValidObjectId(id)) {
        throw new BadRequestException('Invalid retailer ID format');
      }

      if (
        updateRetailerDto.name !== undefined &&
        !updateRetailerDto.name?.trim()
      ) {
        throw new BadRequestException('Retailer name cannot be empty');
      }

      const oldRetailer = await this.retailerModel.findById(id).exec();
      if (!oldRetailer) {
        throw new ResourceNotFoundException('Retailer', id);
      }

      const updatedRetailer = await this.retailerModel
        .findByIdAndUpdate(id, updateRetailerDto, {
          new: true,
          runValidators: true,
        })
        .exec();

      if (!updatedRetailer) {
        throw new ResourceNotFoundException('Retailer', id);
      }

      return { updated: updatedRetailer, oldData: oldRetailer };
    } catch (error) {
      if (error.code === 11000) {
        throw new DuplicateResourceException(
          'Retailer',
          'name',
          updateRetailerDto.name || 'unknown',
        );
      }
      if (
        error instanceof BadRequestException ||
        error instanceof ResourceNotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to update retailer');
    }
  }

  async remove(id: string): Promise<Retailer> {
    try {
      if (!isValidObjectId(id)) {
        throw new BadRequestException('Invalid retailer ID format');
      }

      const result = await this.retailerModel.findByIdAndDelete(id).exec();
      if (!result) {
        throw new ResourceNotFoundException('Retailer', id);
      }
      return result;
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ResourceNotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to delete retailer');
    }
  }

  async getStats(): Promise<{
    totalRetailers: number;
    activeRetailers: number;
    retailersByCountry: { country: string; count: number }[];
  }> {
    try {
      const [totalRetailers, activeRetailers, retailersByCountry] =
        await Promise.all([
          this.retailerModel.countDocuments().exec(),
          this.retailerModel.countDocuments({ isActive: true }).exec(),
          this.retailerModel
            .aggregate([
              { $match: { country: { $exists: true, $ne: null } } },
              { $group: { _id: '$country', count: { $sum: 1 } } },
              { $sort: { count: -1 } },
              { $limit: 10 },
              { $project: { country: '$_id', count: 1, _id: 0 } },
            ])
            .exec(),
        ]);

      return {
        totalRetailers,
        activeRetailers,
        retailersByCountry,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to retrieve retailer statistics',
      );
    }
  }
}
