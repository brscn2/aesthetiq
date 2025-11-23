import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ColorAnalysis, ColorAnalysisDocument } from './schemas/color-analysis.schema';
import { CreateColorAnalysisDto } from './dto/create-color-analysis.dto';

@Injectable()
export class AnalysisService {
  constructor(
    @InjectModel(ColorAnalysis.name)
    private colorAnalysisModel: Model<ColorAnalysisDocument>,
  ) {}

  async create(createAnalysisDto: CreateColorAnalysisDto): Promise<ColorAnalysis> {
    const createdAnalysis = new this.colorAnalysisModel(createAnalysisDto);
    return createdAnalysis.save();
  }

  async findLatestByUserId(userId: string): Promise<ColorAnalysis | null> {
    return this.colorAnalysisModel
      .findOne({ userId })
      .sort({ scanDate: -1 })
      .exec();
  }

  async findAllByUserId(userId: string): Promise<ColorAnalysis[]> {
    return this.colorAnalysisModel.find({ userId }).sort({ scanDate: -1 }).exec();
  }

  async findOne(id: string): Promise<ColorAnalysis> {
    const analysis = await this.colorAnalysisModel.findById(id).exec();
    if (!analysis) {
      throw new NotFoundException(`Color analysis with ID ${id} not found`);
    }
    return analysis;
  }

  async remove(id: string): Promise<void> {
    const result = await this.colorAnalysisModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Color analysis with ID ${id} not found`);
    }
  }
}

