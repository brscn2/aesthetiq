import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { WishlistItem, WishlistItemDocument } from './schemas/wishlist-item.schema';
import { CreateWishlistItemDto } from './dto/create-wishlist-item.dto';
import { UpdateWishlistItemDto } from './dto/update-wishlist-item.dto';

@Injectable()
export class WishlistService {
  constructor(
    @InjectModel(WishlistItem.name)
    private wishlistItemModel: Model<WishlistItemDocument>,
  ) {}

  async create(
    createWishlistItemDto: CreateWishlistItemDto,
    userId: string,
  ): Promise<WishlistItem> {
    const wishlistItem = new this.wishlistItemModel({
      ...createWishlistItemDto,
      userId,
    });
    return wishlistItem.save();
  }

  async findAll(userId: string): Promise<WishlistItem[]> {
    return this.wishlistItemModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string, userId: string): Promise<WishlistItem> {
    const item = await this.wishlistItemModel.findOne({ _id: id, userId }).exec();
    if (!item) {
      throw new NotFoundException(`Wishlist item with ID ${id} not found`);
    }
    return item;
  }

  async update(
    id: string,
    userId: string,
    updateWishlistItemDto: UpdateWishlistItemDto,
  ): Promise<WishlistItem> {
    const item = await this.wishlistItemModel
      .findOneAndUpdate(
        { _id: id, userId },
        { $set: updateWishlistItemDto },
        { new: true },
      )
      .exec();

    if (!item) {
      throw new NotFoundException(`Wishlist item with ID ${id} not found`);
    }
    return item;
  }

  async remove(id: string, userId: string): Promise<void> {
    const result = await this.wishlistItemModel
      .deleteOne({ _id: id, userId })
      .exec();

    if (result.deletedCount === 0) {
      throw new NotFoundException(`Wishlist item with ID ${id} not found`);
    }
  }

  async removeAll(userId: string): Promise<{ deletedCount: number }> {
    const result = await this.wishlistItemModel.deleteMany({ userId }).exec();
    return { deletedCount: result.deletedCount };
  }
}
