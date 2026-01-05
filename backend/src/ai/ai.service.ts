import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import OpenAI from 'openai';
import {
  AnalyzeClothingDto,
  ClothingAnalysisResult,
  AnalyzeClothingResponse,
} from './dto/analyze-clothing.dto';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private openai: OpenAI;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      this.logger.warn('OPENAI_API_KEY not configured - AI analysis will not work');
    }
    this.openai = new OpenAI({ apiKey: apiKey || 'dummy-key' });
  }

  async analyzeClothing(dto: AnalyzeClothingDto): Promise<AnalyzeClothingResponse> {
    if (!process.env.OPENAI_API_KEY) {
      return {
        success: false,
        error: 'OpenAI API key not configured',
      };
    }

    if (!dto.imageUrl && !dto.imageBase64) {
      throw new BadRequestException('Either imageUrl or imageBase64 must be provided');
    }

    try {
      const imageContent = dto.imageUrl
        ? { type: 'image_url' as const, image_url: { url: dto.imageUrl } }
        : { type: 'image_url' as const, image_url: { url: dto.imageBase64! } };

      this.logger.log('Calling OpenAI Vision API for clothing analysis...');

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this clothing image and return a JSON object with:
- category: one of "TOP", "BOTTOM", "SHOE", "ACCESSORY" (TOP includes shirts, jackets, sweaters; BOTTOM includes pants, shorts, skirts; SHOE includes all footwear; ACCESSORY includes bags, hats, jewelry, watches, belts)
- subCategory: specific type (e.g., "T-Shirt", "Jeans", "Sneakers", "Watch", "Backpack")
- brand: brand name if visible on the item, otherwise null
- colors: array of up to 5 dominant hex color codes (e.g., ["#FFFFFF", "#000000"]), ordered by dominance

Return ONLY valid JSON, no markdown or explanation. Example:
{"category":"TOP","subCategory":"T-Shirt","brand":"Nike","colors":["#FFFFFF","#000000"]}`,
              },
              imageContent,
            ],
          },
        ],
        max_tokens: 300,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      this.logger.log(`OpenAI response: ${content}`);

      // Parse JSON response
      const parsed = this.parseAnalysisResponse(content);

      return {
        success: true,
        data: parsed,
      };
    } catch (error: any) {
      this.logger.error(`OpenAI analysis failed: ${error.message}`, error.stack);

      // Handle specific OpenAI errors
      if (error.code === 'invalid_api_key') {
        return {
          success: false,
          error: 'Invalid OpenAI API key',
        };
      }

      if (error.code === 'rate_limit_exceeded') {
        return {
          success: false,
          error: 'Rate limit exceeded. Please try again later.',
        };
      }

      return {
        success: false,
        error: error.message || 'Failed to analyze image',
      };
    }
  }

  private parseAnalysisResponse(content: string): ClothingAnalysisResult {
    try {
      // Remove markdown code blocks if present
      let jsonStr = content.trim();
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.slice(7);
      }
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.slice(3);
      }
      if (jsonStr.endsWith('```')) {
        jsonStr = jsonStr.slice(0, -3);
      }
      jsonStr = jsonStr.trim();

      const parsed = JSON.parse(jsonStr);

      // Validate and normalize the response
      const validCategories = ['TOP', 'BOTTOM', 'SHOE', 'ACCESSORY'];
      const category = validCategories.includes(parsed.category?.toUpperCase())
        ? parsed.category.toUpperCase()
        : 'ACCESSORY';

      // Validate colors are hex codes
      const colors = (parsed.colors || [])
        .filter((c: string) => typeof c === 'string' && /^#[0-9A-Fa-f]{6}$/.test(c))
        .slice(0, 5)
        .map((c: string) => c.toUpperCase());

      return {
        category: category as ClothingAnalysisResult['category'],
        subCategory: parsed.subCategory || undefined,
        brand: parsed.brand || undefined,
        colors: colors.length > 0 ? colors : ['#808080'], // Default grey if no colors detected
        confidence: 0.85, // OpenAI doesn't provide confidence, use default
      };
    } catch (error) {
      this.logger.error(`Failed to parse OpenAI response: ${content}`);
      throw new Error('Failed to parse AI response');
    }
  }
}
