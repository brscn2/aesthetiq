import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Outfit, OutfitDocument } from './schemas/outfit.schema';
import { CreateOutfitDto } from './dto/create-outfit.dto';
import { UpdateOutfitDto } from './dto/update-outfit.dto';

@Injectable()
export class OutfitService {
  constructor(
    @InjectModel(Outfit.name)
    private outfitModel: Model<OutfitDocument>,
  ) {}

  async create(
    createOutfitDto: CreateOutfitDto,
    userId: string,
  ): Promise<Outfit> {
    // Validate that at least one item is provided
    const { items } = createOutfitDto;
    const hasItems =
      items.top ||
      items.bottom ||
      items.shoe ||
      (items.accessories && items.accessories.length > 0);

    if (!hasItems) {
      throw new BadRequestException(
        'Outfit must contain at least one item (top, bottom, shoe, or accessory)',
      );
    }

    // Convert string IDs to ObjectIds
    const outfitData = {
      ...createOutfitDto,
      userId,
      items: {
        top: items.top ? new Types.ObjectId(items.top) : undefined,
        bottom: items.bottom ? new Types.ObjectId(items.bottom) : undefined,
        shoe: items.shoe ? new Types.ObjectId(items.shoe) : undefined,
        accessories: items.accessories
          ? items.accessories.map((id) => new Types.ObjectId(id))
          : [],
      },
    };

    const createdOutfit = new this.outfitModel(outfitData);
    return createdOutfit.save();
  }

  async findAllByUser(userId: string, favoritesOnly = false): Promise<Outfit[]> {
    const filter: any = { userId };
    if (favoritesOnly) {
      filter.isFavorite = true;
    }
    return this.outfitModel
      .find(filter)
      .populate('items.top')
      .populate('items.bottom')
      .populate('items.shoe')
      .populate('items.accessories')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string, userId: string): Promise<OutfitDocument> {
    const outfit = await this.outfitModel
      .findById(id)
      .populate('items.top')
      .populate('items.bottom')
      .populate('items.shoe')
      .populate('items.accessories')
      .exec();

    if (!outfit) {
      throw new NotFoundException(`Outfit with ID ${id} not found`);
    }

    if (outfit.userId !== userId) {
      throw new ForbiddenException('You do not have access to this outfit');
    }

    return outfit;
  }

  async update(
    id: string,
    updateOutfitDto: UpdateOutfitDto,
    userId: string,
  ): Promise<Outfit> {
    // First check if outfit exists and belongs to user
    const existingOutfit = await this.outfitModel.findById(id).exec();
    if (!existingOutfit) {
      throw new NotFoundException(`Outfit with ID ${id} not found`);
    }
    if (existingOutfit.userId !== userId) {
      throw new ForbiddenException('You do not have access to this outfit');
    }

    // If items are being updated, validate and convert IDs
    let updateData: any = { ...updateOutfitDto };
    if (updateOutfitDto.items) {
      const { items } = updateOutfitDto;
      
      // Check if update would result in empty outfit
      const newItems = {
        top: items.top !== undefined ? items.top : existingOutfit.items.top,
        bottom: items.bottom !== undefined ? items.bottom : existingOutfit.items.bottom,
        shoe: items.shoe !== undefined ? items.shoe : existingOutfit.items.shoe,
        accessories: items.accessories !== undefined 
          ? items.accessories 
          : existingOutfit.items.accessories,
      };

      const hasItems =
        newItems.top ||
        newItems.bottom ||
        newItems.shoe ||
        (newItems.accessories && newItems.accessories.length > 0);

      if (!hasItems) {
        throw new BadRequestException(
          'Outfit must contain at least one item',
        );
      }

      updateData.items = {
        top: items.top ? new Types.ObjectId(items.top) : (items.top === null ? undefined : existingOutfit.items.top),
        bottom: items.bottom ? new Types.ObjectId(items.bottom) : (items.bottom === null ? undefined : existingOutfit.items.bottom),
        shoe: items.shoe ? new Types.ObjectId(items.shoe) : (items.shoe === null ? undefined : existingOutfit.items.shoe),
        accessories: items.accessories
          ? items.accessories.map((id) => new Types.ObjectId(id))
          : existingOutfit.items.accessories,
      };
    }

    const updatedOutfit = await this.outfitModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();

    if (!updatedOutfit) {
      throw new NotFoundException(`Outfit with ID ${id} not found`);
    }

    return updatedOutfit;
  }

  async remove(id: string, userId: string): Promise<Outfit> {
    const outfit = await this.outfitModel.findById(id).exec();
    if (!outfit) {
      throw new NotFoundException(`Outfit with ID ${id} not found`);
    }
    if (outfit.userId !== userId) {
      throw new ForbiddenException('You do not have access to this outfit');
    }

    await this.outfitModel.findByIdAndDelete(id).exec();
    return outfit;
  }

  async toggleFavorite(id: string, userId: string): Promise<Outfit> {
    const outfit = await this.outfitModel.findById(id).exec();
    if (!outfit) {
      throw new NotFoundException(`Outfit with ID ${id} not found`);
    }
    if (outfit.userId !== userId) {
      throw new ForbiddenException('You do not have access to this outfit');
    }

    const updatedOutfit = await this.outfitModel
      .findByIdAndUpdate(id, { isFavorite: !outfit.isFavorite }, { new: true })
      .exec();

    if (!updatedOutfit) {
      throw new NotFoundException(`Outfit with ID ${id} not found`);
    }

    return updatedOutfit;
  }
}
