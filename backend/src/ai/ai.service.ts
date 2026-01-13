import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import OpenAI from 'openai';
import * as crypto from 'crypto';
import {
  AnalyzeClothingDto,
  ClothingAnalysisResult,
  AnalyzeClothingResponse,
} from './dto/analyze-clothing.dto';
import { ImageAnalysis } from '../style-profile/schemas/image-analysis-cache.schema';

// CSS color names to hex mapping (+ custom fashion colors)
const COLOR_MAP: Record<string, string> = {
  "aliceblue": "#f0f8ff", "antiquewhite": "#faebd7", "aqua": "#00ffff", "aquamarine": "#7fffd4",
  "azure": "#f0ffff", "beige": "#f5f5dc", "bisque": "#ffe4c4", "black": "#000000",
  "blanchedalmond": "#ffebcd", "blue": "#0000ff", "blueviolet": "#8a2be2", "brown": "#a52a2a",
  "burgundy": "#800020", "burlywood": "#deb887", "cadetblue": "#5f9ea0", "camel": "#c19a6b",
  "charcoal": "#36454f", "chartreuse": "#7fff00", "chocolate": "#d2691e", "coral": "#ff7f50",
  "cornflowerblue": "#6495ed", "cornsilk": "#fff8dc", "cream": "#fffdd0", "crimson": "#dc143c",
  "cyan": "#00ffff", "darkblue": "#00008b", "darkcyan": "#008b8b", "darkgoldenrod": "#b8860b",
  "darkgray": "#a9a9a9", "darkgreen": "#006400", "darkkhaki": "#bdb76b", "darkmagenta": "#8b008b",
  "darkolivegreen": "#556b2f", "darkorange": "#ff8c00", "darkorchid": "#9932cc", "darkred": "#8b0000",
  "darksalmon": "#e9967a", "darkseagreen": "#8fbc8f", "darkslateblue": "#483d8b", "darkslategray": "#2f4f4f",
  "darkturquoise": "#00ced1", "darkviolet": "#9400d3", "deeppink": "#ff1493", "deepskyblue": "#00bfff",
  "dimgray": "#696969", "dodgerblue": "#1e90ff", "firebrick": "#b22222", "floralwhite": "#fffaf0",
  "forestgreen": "#228b22", "fuchsia": "#ff00ff", "gainsboro": "#dcdcdc", "ghostwhite": "#f8f8ff",
  "gold": "#ffd700", "goldenrod": "#daa520", "gray": "#808080", "green": "#008000",
  "greenyellow": "#adff2f", "honeydew": "#f0fff0", "hotpink": "#ff69b4", "indianred": "#cd5c5c",
  "indigo": "#4b0082", "ivory": "#fffff0", "khaki": "#f0e68c", "lavender": "#e6e6fa",
  "lavenderblush": "#fff0f5", "lawngreen": "#7cfc00", "lemonchiffon": "#fffacd", "lightblue": "#add8e6",
  "lightcoral": "#f08080", "lightcyan": "#e0ffff", "lightgoldenrodyellow": "#fafad2", "lightgrey": "#d3d3d3",
  "lightgreen": "#90ee90", "lightpink": "#ffb6c1", "lightsalmon": "#ffa07a", "lightseagreen": "#20b2aa",
  "lightskyblue": "#87cefa", "lightslategray": "#778899", "lightsteelblue": "#b0c4de", "lightyellow": "#ffffe0",
  "lime": "#00ff00", "limegreen": "#32cd32", "linen": "#faf0e6", "magenta": "#ff00ff",
  "maroon": "#800000", "mediumaquamarine": "#66cdaa", "mediumblue": "#0000cd", "mediumorchid": "#ba55d3",
  "mediumpurple": "#9370d8", "mediumseagreen": "#3cb371", "mediumslateblue": "#7b68ee", "mediumspringgreen": "#00fa9a",
  "mediumturquoise": "#48d1cc", "mediumvioletred": "#c71585", "midnightblue": "#191970", "mintcream": "#f5fffa",
  "mistyrose": "#ffe4e1", "moccasin": "#ffe4b5", "navajowhite": "#ffdead", "navy": "#000080",
  "offwhite": "#faf9f6", "oldlace": "#fdf5e6", "olive": "#808000", "olivedrab": "#6b8e23",
  "orange": "#ffa500", "orangered": "#ff4500", "orchid": "#da70d6", "palegoldenrod": "#eee8aa",
  "palegreen": "#98fb98", "paleturquoise": "#afeeee", "palevioletred": "#d87093", "papayawhip": "#ffefd5",
  "peachpuff": "#ffdab9", "peru": "#cd853f", "pink": "#ffc0cb", "plum": "#dda0dd",
  "powderblue": "#b0e0e6", "purple": "#800080", "rebeccapurple": "#663399", "red": "#ff0000",
  "rosybrown": "#bc8f8f", "royalblue": "#4169e1", "saddlebrown": "#8b4513", "salmon": "#fa8072",
  "sandybrown": "#f4a460", "seagreen": "#2e8b57", "seashell": "#fff5ee", "sienna": "#a0522d",
  "silver": "#c0c0c0", "skyblue": "#87ceeb", "slateblue": "#6a5acd", "slategray": "#708090",
  "snow": "#fffafa", "springgreen": "#00ff7f", "steelblue": "#4682b4", "tan": "#d2b48c",
  "teal": "#008080", "thistle": "#d8bfd8", "tomato": "#ff6347", "turquoise": "#40e0d0",
  "violet": "#ee82ee", "wheat": "#f5deb3", "white": "#ffffff", "whitesmoke": "#f5f5f5",
  "yellow": "#ffff00", "yellowgreen": "#9acd32"
};

// Cache entry with TTL
interface CacheEntry {
  result: AnalyzeClothingResponse;
  timestamp: number;
}

// Cache TTL: 1 hour (in milliseconds)
const CACHE_TTL = 60 * 60 * 1000;
// Max cache size to prevent memory issues
const MAX_CACHE_SIZE = 500;

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private openai: OpenAI;
  // In-memory cache for analysis results
  private analysisCache: Map<string, CacheEntry> = new Map();

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      this.logger.warn('OPENAI_API_KEY not configured - AI analysis will not work');
    }
    this.openai = new OpenAI({ apiKey: apiKey || 'dummy-key' });
  }

  /**
   * Generate a cache key from the image data
   */
  private generateCacheKey(dto: AnalyzeClothingDto): string {
    const data = dto.imageUrl || dto.imageBase64 || '';
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Get cached result if available and not expired
   */
  private getCachedResult(key: string): AnalyzeClothingResponse | null {
    const entry = this.analysisCache.get(key);
    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp > CACHE_TTL) {
      this.analysisCache.delete(key);
      return null;
    }

    this.logger.log(`Cache hit for analysis (key: ${key.substring(0, 8)}...)`);
    return entry.result;
  }

  /**
   * Store result in cache
   */
  private setCachedResult(key: string, result: AnalyzeClothingResponse): void {
    // Evict oldest entries if cache is full
    if (this.analysisCache.size >= MAX_CACHE_SIZE) {
      const oldestKey = this.analysisCache.keys().next().value;
      if (oldestKey) {
        this.analysisCache.delete(oldestKey);
      }
    }

    this.analysisCache.set(key, {
      result,
      timestamp: Date.now(),
    });
    this.logger.log(`Cached analysis result (key: ${key.substring(0, 8)}...)`);
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

    // Check cache first
    const cacheKey = this.generateCacheKey(dto);
    const cachedResult = this.getCachedResult(cacheKey);
    if (cachedResult) {
      return cachedResult;
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
- colors: array of 1-3 DISTINCT dominant colors. Choose from: black, white, gray, darkgray, silver, navy, blue, royalblue, cornflowerblue, skyblue, lightblue, steelblue, slateblue, darkslateblue, teal, turquoise, green, olive, khaki, yellow, gold, orange, coral, red, crimson, pink, hotpink, purple, violet, indigo, brown, chocolate, tan, beige, ivory, cream, maroon, burgundy, salmon, lavender, plum, magenta, cyan, lime, forestgreen, darkgreen, darkblue, midnightblue, slategray, dimgray, charcoal, offwhite, camel
- styleNotes: A brief 1-2 sentence styling tip including: suitable occasions (casual, business, formal, sport, date night, etc.), what to pair it with, and optionally the season. Keep it concise and helpful.

IMPORTANT: Only include truly distinct colors. Do NOT repeat similar shades.

Return ONLY valid JSON. Example:
{"category":"TOP","subCategory":"T-Shirt","brand":"Nike","colors":["black","white"],"styleNotes":"Perfect for casual outings and gym sessions. Pairs well with joggers or dark jeans."}`,
              },
              imageContent,
            ],
          },
        ],
        max_tokens: 400,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      this.logger.log(`OpenAI response: ${content}`);

      // Parse JSON response
      const parsed = this.parseAnalysisResponse(content);

      const result: AnalyzeClothingResponse = {
        success: true,
        data: parsed,
      };

      // Cache the successful result
      this.setCachedResult(cacheKey, result);

      return result;
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

      // Convert color names to hex codes
      const colors = (parsed.colors || [])
        .map((c: string) => {
          if (typeof c !== 'string') return null;
          const colorName = c.toLowerCase().trim();
          // If it's already a hex code, validate and return it
          if (/^#[0-9A-Fa-f]{6}$/.test(c)) {
            return c.toUpperCase();
          }
          // Convert color name to hex
          return COLOR_MAP[colorName] || null;
        })
        .filter((c: string | null): c is string => c !== null)
        .slice(0, 5);

      // Extract and validate styleNotes
      const styleNotes = typeof parsed.styleNotes === 'string' && parsed.styleNotes.trim().length > 0
        ? parsed.styleNotes.trim()
        : undefined;

      return {
        category: category as ClothingAnalysisResult['category'],
        subCategory: parsed.subCategory || undefined,
        brand: parsed.brand || undefined,
        colors: colors.length > 0 ? colors : ['#808080'], // Default grey if no colors detected
        styleNotes,
        confidence: 0.85, // OpenAI doesn't provide confidence, use default
      };
    } catch (error) {
      this.logger.error(`Failed to parse OpenAI response: ${content}`);
      throw new Error('Failed to parse AI response');
    }
  }

  /**
   * Analyze an inspiration image for style persona analysis
   * This method analyzes the image and returns structured style data
   */
  async analyzeInspirationImage(imageUrl: string): Promise<ImageAnalysis> {
    if (!process.env.OPENAI_API_KEY) {
      throw new BadRequestException('OpenAI API key not configured');
    }

    try {
      this.logger.log(`Analyzing inspiration image: ${imageUrl.substring(0, 50)}...`);

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this fashion/style inspiration image and return a JSON object with:
- styleKeywords: array of 3-8 style keywords that describe the aesthetic (e.g., "minimalist", "streetwear", "bohemian", "classic", "edgy", "romantic", "athleisure", "vintage")
- colorPalette: array of 3-5 dominant color names from the image (e.g., "black", "white", "navy", "beige", "camel")
- aestheticNotes: a brief 1-2 sentence description of the overall aesthetic and style vibe
- formalityLevel: one of "casual", "smart-casual", "business", "formal"
- silhouettePreferences: optional array of silhouette descriptions (e.g., "oversized", "fitted", "relaxed", "tailored")
- patterns: optional array of pattern types if visible (e.g., "stripes", "solid", "floral", "geometric")
- dominantColors: optional array of 2-3 most prominent color names

Focus on the overall style aesthetic, not individual clothing items. This is for understanding a person's style inspiration.

Return ONLY valid JSON. Example:
{"styleKeywords":["minimalist","monochrome","architectural"],"colorPalette":["black","white","gray"],"aestheticNotes":"Clean, modern aesthetic with emphasis on silhouette and structure.","formalityLevel":"smart-casual","silhouettePreferences":["oversized","tailored"],"patterns":["solid"],"dominantColors":["black","white"]}`,
              },
              {
                type: 'image_url',
                image_url: { url: imageUrl },
              },
            ],
          },
        ],
        max_tokens: 500,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      this.logger.log(`OpenAI inspiration analysis response: ${content}`);

      // Parse JSON response
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

      // Validate and normalize
      const validFormalityLevels = ['casual', 'smart-casual', 'business', 'formal'];
      const formalityLevel = validFormalityLevels.includes(parsed.formalityLevel?.toLowerCase())
        ? parsed.formalityLevel.toLowerCase()
        : 'casual';

      return {
        styleKeywords: Array.isArray(parsed.styleKeywords) ? parsed.styleKeywords : [],
        colorPalette: Array.isArray(parsed.colorPalette) ? parsed.colorPalette : [],
        aestheticNotes: typeof parsed.aestheticNotes === 'string' ? parsed.aestheticNotes : '',
        formalityLevel: formalityLevel as 'casual' | 'smart-casual' | 'business' | 'formal',
        silhouettePreferences: Array.isArray(parsed.silhouettePreferences) ? parsed.silhouettePreferences : undefined,
        patterns: Array.isArray(parsed.patterns) ? parsed.patterns : undefined,
        dominantColors: Array.isArray(parsed.dominantColors) ? parsed.dominantColors : undefined,
      };
    } catch (error: any) {
      this.logger.error(`OpenAI inspiration analysis failed: ${error.message}`, error.stack);
      throw new Error(`Failed to analyze inspiration image: ${error.message}`);
    }
  }

  /**
   * Determine style persona from aggregated image analyses and user preferences
   */
  async determineStylePersona(
    analyses: ImageAnalysis[],
    preferences: {
      sliders?: Record<string, number>;
      favoriteBrands?: string[];
      fitPreferences?: {
        top?: string;
        bottom?: string;
        outerwear?: string;
      };
      budgetRange?: string;
      negativeConstraints?: string[];
    },
  ): Promise<{ archetype: string; description: string }> {
    if (!process.env.OPENAI_API_KEY) {
      throw new BadRequestException('OpenAI API key not configured');
    }

    try {
      // Aggregate image analysis data
      const allStyleKeywords = analyses.flatMap((a) => a.styleKeywords || []);
      const allColors = analyses.flatMap((a) => a.colorPalette || []);
      const aestheticNotes = analyses.map((a) => a.aestheticNotes).filter(Boolean).join('; ');
      const formalityLevels = analyses.map((a) => a.formalityLevel);

      // Count keyword frequency
      const keywordCounts: Record<string, number> = {};
      allStyleKeywords.forEach((keyword) => {
        keywordCounts[keyword.toLowerCase()] = (keywordCounts[keyword.toLowerCase()] || 0) + 1;
      });

      const topKeywords = Object.entries(keywordCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([keyword]) => keyword);

      // Build context for persona determination
      const context = {
        imageAnalyses: analyses.length,
        topStyleKeywords: topKeywords,
        dominantColors: [...new Set(allColors)].slice(0, 8),
        aestheticNotes,
        averageFormality: formalityLevels.length > 0
          ? formalityLevels.reduce((acc, level) => {
              const levels = { casual: 1, 'smart-casual': 2, business: 3, formal: 4 };
              return acc + (levels[level] || 1);
            }, 0) / formalityLevels.length
          : 2,
        userPreferences: {
          sliders: preferences.sliders || {},
          favoriteBrands: preferences.favoriteBrands || [],
          fitPreferences: preferences.fitPreferences || {},
          budgetRange: preferences.budgetRange || 'mid-range',
          negativeConstraints: preferences.negativeConstraints || [],
        },
      };

      this.logger.log('Determining style persona from aggregated data...');

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: `Based on the following style inspiration data and user preferences, determine the user's style persona (archetype).

Image Analysis Summary:
- ${analyses.length} inspiration images analyzed
- Top style keywords: ${topKeywords.join(', ')}
- Dominant colors: ${context.dominantColors.join(', ')}
- Aesthetic notes: ${aestheticNotes || 'Not available'}
- Average formality level: ${context.averageFormality.toFixed(1)}/4

User Preferences:
- Style sliders: ${JSON.stringify(preferences.sliders || {})}
- Favorite brands: ${preferences.favoriteBrands?.join(', ') || 'None specified'}
- Fit preferences: ${JSON.stringify(preferences.fitPreferences || {})}
- Budget range: ${preferences.budgetRange || 'mid-range'}
- No-go items: ${preferences.negativeConstraints?.join(', ') || 'None'}

Determine the most appropriate style archetype from these options (or suggest a new one if none fit perfectly):
1. "Urban Minimalist" - Clean lines, monochromatic tones, functional fabrics, architectural shapes
2. "Classic Elegance" - Timeless pieces, refined sophistication, quality basics, elegant silhouettes
3. "Bold Innovator" - Experimental with color/pattern/shape, creative spirit, boundary-pushing
4. "Casual Comfort" - Comfort and ease prioritized, relaxed fits, versatile pieces

Return a JSON object with:
- archetype: the archetype name (use one of the 4 above, or suggest a new descriptive name if none fit)
- description: a personalized 2-3 sentence description that reflects their specific style based on the data provided

Return ONLY valid JSON. Example:
{"archetype":"Urban Minimalist","description":"You prefer clean lines, monochromatic tones, and functional fabrics. Your aesthetic prioritizes silhouette over pattern, favoring architectural shapes that bridge the gap between office sophistication and street-style edge."}`,
          },
        ],
        max_tokens: 300,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      this.logger.log(`OpenAI persona determination response: ${content}`);

      // Parse JSON response
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

      return {
        archetype: typeof parsed.archetype === 'string' ? parsed.archetype : 'Urban Minimalist',
        description: typeof parsed.description === 'string' ? parsed.description : 'Your unique style profile is being developed based on your preferences and wardrobe.',
      };
    } catch (error: any) {
      this.logger.error(`OpenAI persona determination failed: ${error.message}`, error.stack);
      // Fallback to default
      return {
        archetype: 'Urban Minimalist',
        description: 'Your unique style profile is being developed based on your preferences and wardrobe.',
      };
    }
  }

  /**
   * Generate a personalized description for a given archetype
   * This can be used to enhance the description based on specific user data
   */
  async generatePersonaDescription(
    archetype: string,
    analyses: ImageAnalysis[],
  ): Promise<string> {
    if (!process.env.OPENAI_API_KEY) {
      return 'Your unique style profile is being developed based on your preferences and wardrobe.';
    }

    try {
      const allStyleKeywords = analyses.flatMap((a) => a.styleKeywords || []);
      const aestheticNotes = analyses.map((a) => a.aestheticNotes).filter(Boolean).join('; ');

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: `Generate a personalized 2-3 sentence description for the style archetype "${archetype}" based on these inspiration images:

Style keywords from images: ${[...new Set(allStyleKeywords)].slice(0, 15).join(', ')}
Aesthetic notes: ${aestheticNotes || 'Not available'}

The description should be personalized and specific to their style, not generic. Return ONLY the description text, no JSON.`,
          },
        ],
        max_tokens: 200,
      });

      const content = response.choices[0]?.message?.content;
      if (content && content.trim()) {
        return content.trim();
      }
    } catch (error: any) {
      this.logger.error(`Failed to generate persona description: ${error.message}`);
    }

    // Fallback to default descriptions
    const defaultDescriptions: Record<string, string> = {
      'Urban Minimalist': 'You prefer clean lines, monochromatic tones, and functional fabrics. Your aesthetic prioritizes silhouette over pattern, favoring architectural shapes that bridge the gap between office sophistication and street-style edge.',
      'Classic Elegance': 'You value timeless pieces and refined sophistication. Your style is built on quality basics and elegant silhouettes that never go out of fashion.',
      'Bold Innovator': "You're not afraid to experiment with color, pattern, and shape. Your wardrobe reflects your creative spirit and willingness to push boundaries.",
      'Casual Comfort': 'Comfort and ease are your priorities. You favor relaxed fits and versatile pieces that work for any occasion.',
    };

    return defaultDescriptions[archetype] || 'Your unique style profile is being developed based on your preferences and wardrobe.';
  }
}
