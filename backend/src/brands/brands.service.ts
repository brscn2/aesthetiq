import { Injectable, NotFoundException, ConflictException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import { Brand, BrandDocument } from './schemas/brand.schema';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { ResourceNotFoundException, DuplicateResourceException, InvalidOperationException } from '../common/exceptions/admin.exceptions';

export interface BrandSearchOptions {
  search?: string;
  country?: string;
  foundedYear?: number;
  limit?: number;
  offset?: number;
}

@Injectable()
export class BrandsService {
  constructor(@InjectModel(Brand.name) private brandModel: Model<BrandDocument>) {}

  async create(createBrandDto: CreateBrandDto): Promise<Brand> {
    try {
      // Validate input
      if (!createBrandDto.name?.trim()) {
        throw new BadRequestException('Brand name is required and cannot be empty');
      }

      const createdBrand = new this.brandModel(createBrandDto);
      return await createdBrand.save();
    } catch (error) {
      if (error.code === 11000) {
        throw new DuplicateResourceException('Brand', 'name', createBrandDto.name);
      }
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to create brand');
    }
  }

  async findAll(options: BrandSearchOptions = {}): Promise<{ brands: Brand[]; total: number }> {
    try {
      const { search, country, foundedYear, limit = 50, offset = 0 } = options;
      
      // Validate pagination parameters
      if (limit < 1 || limit > 100) {
        throw new BadRequestException('Limit must be between 1 and 100');
      }
      if (offset < 0) {
        throw new BadRequestException('Offset must be non-negative');
      }
      
      // Build query
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
      
      if (foundedYear) {
        if (foundedYear < 1800 || foundedYear > new Date().getFullYear()) {
          throw new BadRequestException('Founded year must be between 1800 and current year');
        }
        query.foundedYear = foundedYear;
      }

      // Execute query with pagination
      const [brands, total] = await Promise.all([
        this.brandModel
          .find(query)
          .sort({ name: 1 })
          .limit(limit)
          .skip(offset)
          .exec(),
        this.brandModel.countDocuments(query).exec(),
      ]);

      return { brands, total };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to retrieve brands');
    }
  }

  async findOne(id: string): Promise<Brand> {
    try {
      // Validate ObjectId format
      if (!isValidObjectId(id)) {
        throw new BadRequestException('Invalid brand ID format');
      }

      const brand = await this.brandModel.findById(id).exec();
      if (!brand) {
        throw new ResourceNotFoundException('Brand', id);
      }
      return brand;
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof ResourceNotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to retrieve brand');
    }
  }

  async findByName(name: string): Promise<Brand | null> {
    return this.brandModel.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } }).exec();
  }

  async update(id: string, updateBrandDto: UpdateBrandDto): Promise<{ updated: Brand; oldData: Brand }> {
    try {
      // Validate ObjectId format
      if (!isValidObjectId(id)) {
        throw new BadRequestException('Invalid brand ID format');
      }

      // Validate input
      if (updateBrandDto.name !== undefined && !updateBrandDto.name?.trim()) {
        throw new BadRequestException('Brand name cannot be empty');
      }

      // Get the old data first for audit logging
      const oldBrand = await this.brandModel.findById(id).exec();
      if (!oldBrand) {
        throw new ResourceNotFoundException('Brand', id);
      }

      const updatedBrand = await this.brandModel
        .findByIdAndUpdate(id, updateBrandDto, { new: true, runValidators: true })
        .exec();
      
      if (!updatedBrand) {
        throw new ResourceNotFoundException('Brand', id);
      }
      
      return { updated: updatedBrand, oldData: oldBrand };
    } catch (error) {
      if (error.code === 11000) {
        throw new DuplicateResourceException('Brand', 'name', updateBrandDto.name || 'unknown');
      }
      if (error instanceof BadRequestException || error instanceof ResourceNotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to update brand');
    }
  }

  async remove(id: string): Promise<Brand> {
    try {
      // Validate ObjectId format
      if (!isValidObjectId(id)) {
        throw new BadRequestException('Invalid brand ID format');
      }

      const result = await this.brandModel.findByIdAndDelete(id).exec();
      if (!result) {
        throw new ResourceNotFoundException('Brand', id);
      }
      return result;
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof ResourceNotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to delete brand');
    }
  }

  async getStats(): Promise<{
    totalBrands: number;
    brandsByCountry: { country: string; count: number }[];
    brandsByDecade: { decade: string; count: number }[];
  }> {
    try {
      const [totalBrands, brandsByCountry, brandsByDecade] = await Promise.all([
        this.brandModel.countDocuments().exec(),
        this.brandModel.aggregate([
          { $match: { country: { $exists: true, $ne: null } } },
          { $group: { _id: '$country', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
          { $project: { country: '$_id', count: 1, _id: 0 } },
        ]).exec(),
        this.brandModel.aggregate([
          { $match: { foundedYear: { $exists: true, $ne: null } } },
          {
            $group: {
              _id: { $subtract: ['$foundedYear', { $mod: ['$foundedYear', 10] }] },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
          { $project: { decade: { $concat: [{ $toString: '$_id' }, 's'] }, count: 1, _id: 0 } },
        ]).exec(),
      ]);

      return {
        totalBrands,
        brandsByCountry,
        brandsByDecade,
      };
    } catch (error) {
      throw new InternalServerErrorException('Failed to retrieve brand statistics');
    }
  }
}