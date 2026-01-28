import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import FormData from 'form-data';
import { ColorAnalysis, ColorAnalysisDocument } from './schemas/color-analysis.schema';
import { CreateColorAnalysisDto } from './dto/create-color-analysis.dto';
import { AzureStorageService } from '../upload/azure-storage.service';
import { EmbeddingService } from '../ai/embedding.service';

@Injectable()
export class AnalysisService {
  private readonly logger = new Logger(AnalysisService.name);
  private readonly pythonEngineUrl = process.env.PYTHON_ENGINE_URL || 'http://localhost:8000';

  constructor(
    @InjectModel(ColorAnalysis.name)
    private colorAnalysisModel: Model<ColorAnalysisDocument>,
    private readonly httpService: HttpService,
    private readonly azureStorageService: AzureStorageService,
    private readonly embeddingService: EmbeddingService,
  ) {}

  async analyzeImage(file: Express.Multer.File, userId: string): Promise<ColorAnalysis> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    let imageUrl: string | undefined;

    try {
      // 0. Validate image content (Zero-Trust Fashion Check)
      // This ensures we only process clothing/fashion items or people
      const isValid = await this.embeddingService.validateImage(file);
      
      if (!isValid) {
        throw new BadRequestException(
          'Invalid Item: The uploaded image does not appear to be a clothing item or fashion accessory. Please upload a relevant photo.'
        );
      }

      // First, save the image to blob storage
      this.logger.log('Uploading image to blob storage...');
      try {
        imageUrl = await this.azureStorageService.uploadImage(file);
        this.logger.log(`Image uploaded to blob storage: ${imageUrl}`);
      } catch (storageError) {
        this.logger.error(`Failed to upload image to blob storage: ${storageError.message}`);
        // Continue with analysis even if storage fails, but log the error
        // In production, you might want to throw here instead
      }

      // Call Python engine using FormData with HttpService (NestJS HTTP client)
      const formData = new FormData();
      formData.append('file', file.buffer, {
        filename: file.originalname || 'image.jpg',
        contentType: file.mimetype || 'image/jpeg',
      });

      this.logger.log(`Calling Python engine at ${this.pythonEngineUrl}/api/v1/ml/analyze-face`);
      
      // Use HttpService (NestJS wrapper around axios) which handles form-data streams correctly
      // HttpService returns Observables, so we use firstValueFrom to convert to Promise
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.pythonEngineUrl}/api/v1/ml/analyze-face`,
          formData,
          {
            headers: {
              ...formData.getHeaders(),
            },
          }
        )
      );

      const pythonResult = response.data;

      if (pythonResult.error) {
        throw new BadRequestException(`Analysis error: ${pythonResult.error}`);
      }

      // Map Python engine response to DTO format
      const createDto = this.mapPythonResultToDto(pythonResult, userId);
      
      // Add the image URL to the DTO
      if (imageUrl) {
        createDto.imageUrl = imageUrl;
      }

      // Save to database
      return this.create(createDto);
    } catch (error) {
      this.logger.error(`Failed to analyze image: ${error.message}`, error.stack);
      
      // Handle HttpService/axios errors
      if (error.response) {
        const errorText = error.response.data?.detail || error.response.data || JSON.stringify(error.response.data);
        this.logger.error(`Python engine error: ${errorText}`);
        throw new BadRequestException(`Analysis failed: ${errorText}`);
      }
      
      // Handle other errors
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      throw new BadRequestException(`Failed to analyze image: ${error.message || 'Unknown error'}`);
    }
  }

  private mapPythonResultToDto(
    pythonResult: any,
    userId: string,
  ): CreateColorAnalysisDto {
    const palette = pythonResult.palette || 'Unknown';
    
    // Extract season, contrast level, and undertone from palette name
    const { season, contrastLevel, undertone } = this.parseSeason(palette);
    
    // Get color palette for the season using the original Python output (before "Deep" conversion)
    // Python returns title case like "Dark Autumn", we need to use the original for palette lookup
    const paletteColors = this.getSeasonPalette(palette);

    return {
      userId,
      season,
      contrastLevel,
      undertone,
      palette: paletteColors,
      faceShape: pythonResult.face_shape || undefined,
      scanDate: new Date().toISOString(),
    };
  }

  private parseSeason(palette: string): {
    season: string;
    contrastLevel: string;
    undertone: string;
  } {
    const upperPalette = palette.toUpperCase();
    
    // Extract contrast level
    let contrastLevel = 'Medium';
    if (upperPalette.includes('DARK') || upperPalette.includes('BRIGHT')) {
      contrastLevel = 'High';
    } else if (upperPalette.includes('LIGHT') || upperPalette.includes('MUTED')) {
      contrastLevel = 'Low';
    }

    // Extract undertone
    let undertone = 'Neutral';
    if (upperPalette.includes('AUTUMN') || upperPalette.includes('SPRING')) {
      undertone = 'Warm';
    } else if (upperPalette.includes('WINTER') || upperPalette.includes('SUMMER')) {
      undertone = 'Cool';
    }

    // Keep the season name as returned by Python engine (title case)
    // Python returns: "Dark Autumn", "Light Spring", etc.
    const season = palette;

    return { season, contrastLevel, undertone };
  }

  private getSeasonPalette(palette: string): Array<{ name: string; hex: string }> {
    // Map of seasons to their characteristic color palettes with names and hex codes
    // These match exactly with the Python engine's season_classes (in alphabetical order):
    // "DARK AUTUMN", "DARK WINTER", "LIGHT SPRING", "LIGHT SUMMER",
    // "MUTED AUTUMN", "MUTED SUMMER", "BRIGHT SPRING", "BRIGHT WINTER",
    // "WARM AUTUMN", "WARM SPRING", "COOL WINTER", "COOL SUMMER"
    const seasonPalettes: Record<string, Array<{ name: string; hex: string }>> = {
      'DARK AUTUMN': [
        {
          name: "Espresso",
          hex: "#3C2218", // A deep, warm, almost-black brown
        },
        {
          name: "Marine Navy",
          hex: "#101E4A", // A warm, muted navy blue
        },
        {
          name: "Dark Olive",
          hex: "#574D35", // A deep, earthy green
        },
        {
          name: "Deep Teal",
          hex: "#005F5F", // A rich, petrol blue-green
        },
        {
          name: "Rust",
          hex: "#6B2E1B", // A deep, oxidized red
        },
        {
          name: "Terracotta",
          hex: "#c45824", // A warm, burnt orange
        },
        {
          name: "Goldenrod Mustard",
          hex: "#daa520", // A rich, spicy yellow-gold
        },
        {
          name: "Warm Aubergine",
          hex: "#370028", // A deep, brownish purple
        },
      ],
      'DARK WINTER': [
        {
          name: "Jet Black",
          hex: "#444548", // A true, stark black (unlike Autumn's brownish-black)
        },
        {
          name: "Midnight Navy",
          hex: "#101E4A", // A very dark, cool blue
        },
        {
          name: "Deep Charcoal",
          hex: "#3d3c3e", // A dark, cool grey
        },
        {
          name: "Pine Green",
          hex: "#0c2017", // A rich, bluish green
        },
        {
          name: "Damson",
          hex: "#6f5661", // A deep, cool plum purple
        },
        {
          name: "Blood Red",
          hex: "#660000", // A deep, blue-based red (Burgundy)
        },
        {
          name: "Royal Purple",
          hex: "#4e1469", // A dark, intense violet
        },
        {
          name: "Icy Lemon",
          hex: "#fbecbb", // A high-contrast icy yellow for accent
        },
      ],
      'LIGHT SPRING': [
        {
          name: "Camel",
          hex: "#d6b077", // A golden-brown neutral, lighter than Autumn's browns
        },
        {
          name: "Buttermilk",
          hex: "#f5d0a4", // A warm, creamy off-white
        },
        {
          name: "Warm Coral",
          hex: "#e39a9b", // A pink-orange blend, lighter than red
        },
        {
          name: "Peach",
          hex: "#fd9467", // A soft, warm orange
        },
        {
          name: "Primrose Yellow",
          hex: "#fcce45", // A clear, sunny yellow without the heavy spice of Autumn
        },
        {
          name: "Fresh Green",
          hex: "#a7c8a4", // A yellow-based grass green
        },
        {
          name: "Clear Aqua",
          hex: "#c4e9e1", // A bright, warm turquoise
        },
        {
          name: "Warm Periwinkle",
          hex: "#807aa5", // A violet-blue that leans slightly purple/warm
        },
      ],
      'LIGHT SUMMER': [
        {
          name: "Soft White",
          hex: "#e9e0c9", // A cool, muted white (stark white is too harsh)
        },
        {
          name: "Cloud Grey",
          hex: "#c4c1b8", // A light, cool grey with blue undertones
        },
        {
          name: "Powder Pink",
          hex: "#eec4c9", // A cool, baby pink (distinctly not peach)
        },
        {
          name: "Lavender",
          hex: "#e6d2f1", // A soft, cool light purple
        },
        {
          name: "Sky Blue",
          hex: "#76d7ea", // A clear, airy blue
        },
        {
          name: "Seafoam Green",
          hex: "#71eeb8", // A cool, blue-based green
        },
        {
          name: "Pale Lemon",
          hex: "#f7eab7", // A soft yellow that leans green/cool, not golden
        },
        {
          name: "Soft Raspberry",
          hex: "#e96792", // A muted, pinkish red (watermelon tone)
        },
      ],
      'MUTED AUTUMN': [
        {
          name: "Oatmeal",
          hex: "#fbca9c", // A soft, beige neutral (not stark white)
        },
        {
          name: "Taupe",
          hex: "#5c4b47", // A grey-brown blend, the core neutral of this season
        },
        {
          name: "Sage Green",
          hex: "#54645d", // A desaturated, greyish green
        },
        {
          name: "Muted Teal",
          hex: "#5f8a8b", // A soft blue-green, less intense than Dark Autumn's teal
        },
        {
          name: "Old Rose",
          hex: "#cba5a8", // A warm, dusty pink
        },
        {
          name: "Soft Terracotta",
          hex: "#c38b72", // A burnt orange that has been browned down
        },
        {
          name: "Khaki",
          hex: "#c1be8a", // An earthy, brownish green
        },
        {
          name: "Mustard Gold",
          hex: "#dc8f25", // A yellow that is rich but not blindingly bright
        },
      ],
      'MUTED SUMMER': [
        {
          name: "Soft White",
          hex: "#e9e0c9", // A greyed-off white, never bright
        },
        {
          name: "Grey Blue",
          hex: "#616974", // A dusty medium blue
        },
        {
          name: "Rose Brown",
          hex: "#b98d83", // A brownish-pink, very characteristic of this season
        },
        {
          name: "Mauve",
          hex: "#848392", // A muted, dusty purple
        },
        {
          name: "Soft Fucshia",
          hex: "#d496bd", // A pink that is cool but not electric
        },
        {
          name: "Sea Green",
          hex: "#93dfb8", // A cool green with heavy grey undertones
        },
        {
          name: "Charcoal Blue",
          hex: "#283143", // A dark, soft navy-grey
        },
        {
          name: "Periwinkle Grey",
          hex: "#c3cde6", // A blurry mix of blue, violet, and grey
        },
      ],
      'BRIGHT SPRING': [
        {
          name: "Poppy Red",
          hex: "#eb2a14", // A vivid, clear, orange-based red
        },
        {
          name: "Tropical Turquoise",
          hex: "#32638d", // A bright, energetic aqua
        },
        {
          name: "Sunny Yellow",
          hex: "#fceb4a", // A pure, saturated yellow (like a daffodil)
        },
        {
          name: "Hot Coral",
          hex: "#e51d2e", // A punchy, warm pink-orange
        },
        {
          name: "Electric Blue",
          hex: "#00a1ad", // A vibrant, clear blue (close to Cyan)
        },
        {
          name: "Lime Green",
          hex: "#b2e92e", // A fresh, yellow-based bright green
        },
        {
          name: "Bright Violet",
          hex: "#9000e7", // A vivid purple (borrowed from Winter influence)
        },
        {
          name: "Warm Charcoal",
          hex: "#514d4f", // A dark, brownish-grey for high contrast (instead of harsh black)
        },
      ],
      'BRIGHT WINTER': [
        {
          name: "Icy White",
          hex: "#c1cce0", // Pure, stark white (unlike the soft whites of Summer/Autumn)
        },
        {
          name: "Black",
          hex: "#000000", // True, pure black
        },
        {
          name: "Hot Pink",
          hex: "#d5276a", // A vivid, electric pink (Magenta)
        },
        {
          name: "Royal Blue",
          hex: "#2d65a4", // A highly saturated, intense blue
        },
        {
          name: "Emerald Green",
          hex: "#046307", // A sharp, clean, blue-based green
        },
        {
          name: "Ruby Red",
          hex: "#6c2119", // A deep, slightly blue-toned red
        },
        {
          name: "Bright Purple",
          hex: "#ba55d3", // An intense, electric violet
        },
        {
          name: "Acid Yellow",
          hex: "#fff500", // A sharp, greenish yellow (Chartreuse-leaning)
        },
      ],
      'WARM AUTUMN': [
        {
          name: "Chocolate Brown",
          hex: "#3f000f", // A rich, warm brown (the staple neutral)
        },
        {
          name: "Pumpkin Orange",
          hex: "#c4321f", // The quintessential autumn color
        },
        {
          name: "Mustard Gold",
          hex: "#dc8f25", // A deep, golden yellow
        },
        {
          name: "Tomato Red",
          hex: "#d0373a", // A warm, orange-based red
        },
        {
          name: "Olive Green",
          hex: "#747b4f", // A yellow-based, swampy green
        },
        {
          name: "Peacock Blue",
          hex: "#005f69", // A rich, warm teal (the only "blue" that truly fits)
        },
        {
          name: "Bronze",
          hex: "#88540b", // A metallic, earthy brown
        },
        {
          name: "Forest Green",
          hex: "#3c4b3a", // A deep, warm green
        },
      ],
      'WARM SPRING': [
        {
          name: "Golden Brown",
          hex: "#a28359", // A distinct golden-bronze neutral (lighter than Autumn's chocolate)
        },
        {
          name: "Cream",
          hex: "#d0b699", // A rich, yellow-based white
        },
        {
          name: "Coral",
          hex: "#e51d2e", // A vibrant pink-orange
        },
        {
          name: "Sunshine Yellow",
          hex: "#e4bc3f", // A warm, saturated yellow
        },
        {
          name: "Tomato Red",
          hex: "#d0373a", // An orange-based red, clear and bright
        },
        {
          name: "Leaf Green",
          hex: "#b7dd4a", // A fresh, yellow-based green (like new grass)
        },
        {
          name: "Warm Aqua",
          hex: "#5cb2bd", // A turquoise that leans heavily toward green/yellow
        },
        {
          name: "Apricot",
          hex: "#ffba70", // A soft but saturated orange
        },
      ],
      'COOL WINTER': [
        {
          name: "Black",
          hex: "#000000", // The ultimate staple neutral for this season
        },
        {
          name: "Snow White",
          hex: "#f7f9f6", // Pure, crisp white (brightest of all seasons)
        },
        {
          name: "Sapphire Blue",
          hex: "#202f41", // A rich, deep, jewel-tone blue
        },
        {
          name: "True Red",
          hex: "#8f1d21", // A blue-based red (Crimson), absolutely no orange
        },
        {
          name: "Fuchsia",
          hex: "#fd3f92", // A cool, vivid pink
        },
        {
          name: "Emerald Green",
          hex: "#046307", // A sharp, clean green
        },
        {
          name: "Royal Purple",
          hex: "#4e1469", // A deep, cool violet
        },
        {
          name: "Icy Blue",
          hex: "#69a6d5", // A very pale, sharp tint (often used as a 'light' neutral)
        },
      ],
      'COOL SUMMER': [
        {
          name: "Cool Charcoal",
          hex: "#807b76", // A blue-based dark grey (softer than Black)
        },
        {
          name: "Soft White",
          hex: "#e9e0c9", // A cool, cloudy white
        },
        {
          name: "Slate Grey",
          hex: "#485361", // A classic medium grey with blue undertones
        },
        {
          name: "Raspberry",
          hex: "#8c1c1e", // A cool, berry red (not fire engine red)
        },
        {
          name: "Soft Plum",
          hex: "#914e75", // A deep, cool purple-red
        },
        {
          name: "Cornflower Blue",
          hex: "#366cdb", // A medium, clear cool blue
        },
        {
          name: "Sea Green",
          hex: "#00ffcd", // A bluish-green (more blue than yellow)
        },
        {
          name: "Rose Pink",
          hex: "#f09ec3", // A classic cool pink
        },
      ],
    };

    // Python engine returns title case (e.g., "Dark Autumn"), convert to uppercase for lookup
    const upperPalette = palette.toUpperCase();
    const paletteColors = seasonPalettes[upperPalette];
    
    // If not found, return empty array (shouldn't happen if Python engine is working correctly)
    if (!paletteColors) {
      this.logger.warn(`No palette found for season: ${palette} (uppercased: ${upperPalette})`);
      return [];
    }
    
    return paletteColors;
  }

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
    // First, get the analysis to retrieve the image URL
    const analysis = await this.colorAnalysisModel.findById(id).exec();
    if (!analysis) {
      throw new NotFoundException(`Color analysis with ID ${id} not found`);
    }

    // Delete the image from blob storage if it exists
    if (analysis.imageUrl) {
      try {
        this.logger.log(`Deleting image from blob storage: ${analysis.imageUrl}`);
        await this.azureStorageService.deleteImage(analysis.imageUrl);
      } catch (error) {
        // Log error but don't fail the deletion - the blob might already be deleted
        this.logger.warn(`Failed to delete image from blob storage: ${error.message}`);
      }
    }

    // Delete the analysis record from database
    await this.colorAnalysisModel.findByIdAndDelete(id).exec();
    this.logger.log(`Color analysis ${id} deleted successfully`);
  }
}

