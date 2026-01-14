import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  StyleProfile,
  StyleProfileDocument,
} from './schemas/style-profile.schema';
import {
  ImageAnalysisCache,
  ImageAnalysisCacheDocument,
  ImageAnalysis,
} from './schemas/image-analysis-cache.schema';
import {
  PersonaAnalysisJob,
  PersonaAnalysisJobDocument,
  PersonaAnalysisStatus,
} from './schemas/persona-analysis-job.schema';
import { CreateStyleProfileDto } from './dto/create-style-profile.dto';
import { UpdateStyleProfileDto } from './dto/update-style-profile.dto';
import { AiService } from '../ai/ai.service';
import { AdminService } from '../admin/admin.service';
import * as crypto from 'crypto';

@Injectable()
export class StyleProfileService {
  private readonly logger = new Logger(StyleProfileService.name);
  private readonly RATE_LIMIT_HOURS = 1; // 1 hour rate limit

  constructor(
    @InjectModel(StyleProfile.name)
    private styleProfileModel: Model<StyleProfileDocument>,
    @InjectModel(ImageAnalysisCache.name)
    private imageAnalysisCacheModel: Model<ImageAnalysisCacheDocument>,
    @InjectModel(PersonaAnalysisJob.name)
    private personaAnalysisJobModel: Model<PersonaAnalysisJobDocument>,
    private aiService: AiService,
    private adminService: AdminService,
  ) {}

  async create(
    createStyleProfileDto: CreateStyleProfileDto & { userId: string },
  ): Promise<StyleProfile> {
    const createdProfile = new this.styleProfileModel(createStyleProfileDto);
    return createdProfile.save();
  }

  async findByUserId(userId: string): Promise<StyleProfile | null> {
    return this.styleProfileModel.findOne({ userId }).exec();
  }

  async findOne(id: string): Promise<StyleProfile> {
    const profile = await this.styleProfileModel.findById(id).exec();
    if (!profile) {
      throw new NotFoundException(`Style profile with ID ${id} not found`);
    }
    return profile;
  }

  async update(
    id: string,
    updateStyleProfileDto: UpdateStyleProfileDto,
  ): Promise<StyleProfile> {
    const updatedProfile = await this.styleProfileModel
      .findByIdAndUpdate(id, updateStyleProfileDto, { new: true })
      .exec();
    if (!updatedProfile) {
      throw new NotFoundException(`Style profile with ID ${id} not found`);
    }
    return updatedProfile;
  }

  async updateByUserId(
    userId: string,
    updateStyleProfileDto: UpdateStyleProfileDto,
  ): Promise<StyleProfile> {
    const updatedProfile = await this.styleProfileModel
      .findOneAndUpdate({ userId }, updateStyleProfileDto, {
        new: true,
        upsert: true,
      })
      .exec();
    return updatedProfile;
  }

  async remove(id: string): Promise<void> {
    const result = await this.styleProfileModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Style profile with ID ${id} not found`);
    }
  }

  /**
   * Generate a hash from image URL for caching
   */
  private generateImageUrlHash(imageUrl: string): string {
    return crypto.createHash('sha256').update(imageUrl).digest('hex');
  }

  /**
   * Get cached image analysis or analyze and cache
   */
  private async getOrAnalyzeImage(imageUrl: string): Promise<ImageAnalysis> {
    const imageUrlHash = this.generateImageUrlHash(imageUrl);

    // Check cache
    const cached = await this.imageAnalysisCacheModel
      .findOne({ imageUrlHash })
      .exec();

    if (cached) {
      this.logger.log(`Cache hit for image: ${imageUrlHash.substring(0, 8)}...`);
      return cached.analysis;
    }

    // Analyze image
    this.logger.log(`Analyzing new image: ${imageUrlHash.substring(0, 8)}...`);
    const analysis = await this.aiService.analyzeInspirationImage(imageUrl);

    // Cache the result
    await this.imageAnalysisCacheModel.create({
      imageUrlHash,
      imageUrl,
      analysis,
    });

    return analysis;
  }

  /**
   * Start persona analysis job
   */
  async startPersonaAnalysis(userId: string): Promise<{ jobId: string }> {
    // Check if user is admin (admins bypass rate limit)
    const isAdmin = await this.adminService.isUserAdmin(userId);
    
    if (!isAdmin) {
      // Check rate limit: find last completed analysis within the rate limit window
      const rateLimitWindow = new Date(Date.now() - this.RATE_LIMIT_HOURS * 60 * 60 * 1000);
      
      const recentCompletedJob = await this.personaAnalysisJobModel
        .findOne({
          userId,
          status: PersonaAnalysisStatus.COMPLETED,
          completedAt: { $gte: rateLimitWindow },
        })
        .sort({ completedAt: -1 })
        .exec();

      if (recentCompletedJob) {
        const timeUntilNextAnalysis = Math.ceil(
          (recentCompletedJob.completedAt!.getTime() + this.RATE_LIMIT_HOURS * 60 * 60 * 1000 - Date.now()) / (60 * 1000)
        );
        throw new BadRequestException(
          `Rate limit exceeded. You can analyze your style persona once per hour. Please try again in ${timeUntilNextAnalysis} minute(s).`
        );
      }
    }

    // Check if there's already a pending or processing job
    const existingJob = await this.personaAnalysisJobModel
      .findOne({
        userId,
        status: { $in: [PersonaAnalysisStatus.PENDING, PersonaAnalysisStatus.PROCESSING] },
      })
      .exec();

    if (existingJob) {
      return { jobId: existingJob.jobId };
    }

    // Create new job
    const jobId = crypto.randomUUID();
    const job = await this.personaAnalysisJobModel.create({
      userId,
      jobId,
      status: PersonaAnalysisStatus.PENDING,
      startedAt: new Date(),
    });

    // Start background processing (non-blocking)
    setImmediate(() => {
      this.processPersonaAnalysis(jobId).catch((error) => {
        this.logger.error(`Persona analysis job ${jobId} failed: ${error.message}`, error.stack);
      });
    });

    return { jobId };
  }

  /**
   * Get persona analysis status
   */
  async getPersonaAnalysisStatus(userId: string): Promise<PersonaAnalysisJob | null> {
    return this.personaAnalysisJobModel
      .findOne({ userId })
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Process persona analysis in background
   */
  async processPersonaAnalysis(jobId: string): Promise<void> {
    const job = await this.personaAnalysisJobModel.findOne({ jobId }).exec();
    if (!job) {
      this.logger.error(`Job ${jobId} not found`);
      return;
    }

    // Update status to processing
    job.status = PersonaAnalysisStatus.PROCESSING;
    await job.save();

    try {
      // Get user's style profile
      const profile = await this.styleProfileModel.findOne({ userId: job.userId }).exec();
      if (!profile) {
        throw new NotFoundException(`Style profile for user ${job.userId} not found`);
      }

      // Get inspiration images
      const inspirationImages = profile.inspirationImageUrls || [];
      if (inspirationImages.length === 0) {
        throw new Error('No inspiration images found');
      }

      this.logger.log(`Processing ${inspirationImages.length} inspiration images for user ${job.userId}`);

      // Analyze all images (with caching)
      const analyses: ImageAnalysis[] = [];
      for (const imageUrl of inspirationImages) {
        try {
          const analysis = await this.getOrAnalyzeImage(imageUrl);
          analyses.push(analysis);
        } catch (error: any) {
          this.logger.warn(`Failed to analyze image ${imageUrl}: ${error.message}`);
          // Continue with other images
        }
      }

      if (analyses.length === 0) {
        throw new Error('Failed to analyze any images');
      }

      // Determine persona from aggregated data
      const personaResult = await this.aiService.determineStylePersona(analyses, {
        sliders: profile.sliders ? Object.fromEntries(profile.sliders) : undefined,
        favoriteBrands: profile.favoriteBrands,
        fitPreferences: profile.fitPreferences
          ? {
              top: profile.fitPreferences.top,
              bottom: profile.fitPreferences.bottom,
              outerwear: profile.fitPreferences.outerwear,
            }
          : undefined,
        budgetRange: profile.budgetRange,
        negativeConstraints: profile.negativeConstraints,
      });

      // Update style profile with new archetype
      await this.styleProfileModel
        .findOneAndUpdate(
          { userId: job.userId },
          { archetype: personaResult.archetype },
          { new: true },
        )
        .exec();

      // Mark job as completed
      job.status = PersonaAnalysisStatus.COMPLETED;
      job.completedAt = new Date();
      await job.save();

      this.logger.log(`Persona analysis completed for user ${job.userId}: ${personaResult.archetype}`);

      // TODO: Send notification here (will be implemented in notification-integration todo)
    } catch (error: any) {
      this.logger.error(`Persona analysis failed for job ${jobId}: ${error.message}`, error.stack);
      job.status = PersonaAnalysisStatus.FAILED;
      job.error = error.message;
      job.completedAt = new Date();
      await job.save();
    }
  }
}

