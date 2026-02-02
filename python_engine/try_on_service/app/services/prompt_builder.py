"""Prompt Builder Service for Virtual Try-On."""
from typing import Dict, Any
from app.core.logger import get_logger

logger = get_logger(__name__)


class PromptBuilder:
    """Service for constructing high-quality prompts for virtual try-on."""
    
    @staticmethod
    def build_try_on_prompt(items: Dict[str, Any]) -> str:
        """
        Build a detailed, restrictive prompt for virtual try-on based on clothing items.
        
        Args:
            items: Dictionary of clothing items by category
        
        Returns:
            Detailed prompt string for OpenAI Image Edit API
        """
        item_count = len(items)
        item_type = "clothing item" if item_count == 1 else "clothing items"
        
        # Extract item descriptions
        item_descriptions = []
        for category, item in items.items():
            desc_parts = []
            
            # Add color if available
            if item.get('colorHex') or item.get('color'):
                color = item.get('color', 'colored')
                desc_parts.append(color)
            
            # Add material if available
            if item.get('material'):
                desc_parts.append(item['material'])
            
            # Add sub-category or name
            if item.get('subCategory'):
                desc_parts.append(item['subCategory'].lower())
            elif item.get('name'):
                desc_parts.append(item['name'])
            else:
                desc_parts.append(category.lower())
            
            item_descriptions.append(' '.join(desc_parts))
        
        # Build restrictive prompt based on item count
        if item_count == 1:
            item_desc = item_descriptions[0]
            prompt = f"""Replace ONLY the clothing with the {item_desc} from the reference image.

ABSOLUTE REQUIREMENTS - DO NOT VIOLATE:
1. DO NOT change, modify, or alter the person's FACE in any way
2. DO NOT change hair, skin tone, facial features, or head shape
3. DO NOT change the background, walls, floor, or any environmental elements
4. DO NOT change the person's body proportions or pose
5. ONLY modify the specific clothing area to match the reference garment

The new {item_desc} must:
- Fit naturally on the person's body with realistic wrinkles and fabric draping
- Match the original photo's lighting, shadows, and color temperature
- Appear as if it was originally worn in this exact photo
- Maintain all original textures and details outside the clothing area

CRITICAL: The face must remain 100% identical to the original. This is the highest priority."""
        
        else:
            items_list = ', '.join(item_descriptions[:-1]) + f', and {item_descriptions[-1]}'
            prompt = f"""Replace ONLY the specified clothing items with: {items_list}.

ABSOLUTE REQUIREMENTS - DO NOT VIOLATE:
1. DO NOT change, modify, or alter the person's FACE in any way
2. DO NOT change hair, skin tone, facial features, or head shape
3. DO NOT change the background, walls, floor, or any environmental elements
4. DO NOT change the person's body proportions or pose
5. ONLY modify the specific clothing areas to match the reference garments

The new {item_type} must:
- Fit naturally on the person's body with realistic wrinkles and fabric draping
- Coordinate together as a cohesive, stylish outfit
- Match the original photo's lighting, shadows, and color temperature
- Appear as if they were originally worn in this exact photo
- Maintain all original textures and details outside the clothing areas

CRITICAL: The face must remain 100% identical to the original. This is the highest priority."""
        
        logger.debug(f"Built restrictive prompt for {item_count} items")
        return prompt
