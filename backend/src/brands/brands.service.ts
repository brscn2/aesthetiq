import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Brand, BrandDocument } from './schemas/brand.schema';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';

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
      const createdBrand = new this.brandModel(createBrandDto);
      return await createdBrand.save();
    } catch (error) {
      if (error.code === 11000) {
        throw new ConflictException(`Brand with name '${createBrandDto.name}' already exists`);
      }
      throw error;
    }
  }

  async findAll(options: BrandSearchOptions = {}): Promise<{ brands: Brand[]; total: number }> {
    const { search, country, foundedYear, limit = 50, offset = 0 } = options;
    
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
  }

  async findOne(id: string): Promise<Brand> {
    const brand = await this.brandModel.findById(id).exec();
    if (!brand) {
      throw new NotFoundException(`Brand with ID ${id} not found`);
    }
    return brand;
  }

  async findByName(name: string): Promise<Brand | null> {
    return this.brandModel.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } }).exec();
  }

  async update(id: string, updateBrandDto: UpdateBrandDto): Promise<{ updated: Brand; oldData: Brand }> {
    try {
      // Get the old data first for audit logging
      const oldBrand = await this.brandModel.findById(id).exec();
      if (!oldBrand) {
        throw new NotFoundException(`Brand with ID ${id} not found`);
      }

      const updatedBrand = await this.brandModel
        .findByIdAndUpdate(id, updateBrandDto, { new: true, runValidators: true })
        .exec();
      
      if (!updatedBrand) {
        throw new NotFoundException(`Brand with ID ${id} not found`);
      }
      
      return { updated: updatedBrand, oldData: oldBrand };
    } catch (error) {
      if (error.code === 11000) {
        throw new ConflictException(`Brand with name '${updateBrandDto.name}' already exists`);
      }
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw error;
    }
  }

  async remove(id: string): Promise<Brand> {
    const result = await this.brandModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Brand with ID ${id} not found`);
    }
    return result;
  }

  async getStats(): Promise<{
    totalBrands: number;
    brandsByCountry: { country: string; count: number }[];
    brandsByDecade: { decade: string; count: number }[];
  }> {
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
  }
}