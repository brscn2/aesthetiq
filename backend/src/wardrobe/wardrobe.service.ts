import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  WardrobeItem,
  WardrobeItemDocument,
  Category,
} from './schemas/wardrobe-item.schema';
import { CreateWardrobeItemDto } from './dto/create-wardrobe-item.dto';
import { UpdateWardrobeItemDto } from './dto/update-wardrobe-item.dto';

@Injectable()
export class WardrobeService {
  constructor(
    @InjectModel(WardrobeItem.name)
    private wardrobeItemModel: Model<WardrobeItemDocument>,
  ) {}

  async create(createWardrobeItemDto: CreateWardrobeItemDto): Promise<WardrobeItem> {
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
    const result = await this.wardrobeItemModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Wardrobe item with ID ${id} not found`);
    }
  }
}

