"""Prompt Builder Service for Virtual Try-On."""
from typing import Dict, Any
from app.core.logger import get_logger

logger = get_logger(__name__)


class PromptBuilder:
    """Service for constructing high-quality prompts for virtual try-on."""
    
    @staticmethod
    def build_try_on_prompt(items: Dict[str, Any]) -> str:
        """
        Build a detailed prompt for virtual try-on based on clothing items.
        
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
        
        # Build prompt based on item count
        if item_count == 1:
            item_desc = item_descriptions[0]
            prompt = f"""Create a photorealistic virtual try-on by seamlessly having the person in the first image wear the {item_desc} from the second image.

Instructions:
- Replace or add ONLY the specific clothing piece, keeping everything else identical
- Maintain the person's exact face, skin tone, body proportions, and pose
- Ensure the new clothing fits naturally on their body with realistic shadows, wrinkles, and fabric draping
- Match the lighting and color temperature of the original photo
- Preserve the background and overall composition
- Make the clothing appear as if it was originally worn in the photo
- The final image should be indistinguishable from a real photograph of the person wearing this item."""
        
        else:
            items_list = ', '.join(item_descriptions[:-1]) + f', and {item_descriptions[-1]}'
            prompt = f"""Create a photorealistic virtual try-on by seamlessly dressing the person in the first image with the provided {item_type}: {items_list}.

Instructions:
- Replace ONLY the clothing with the new {item_type}, keeping everything else identical
- Maintain the person's exact face, skin tone, body proportions, and pose
- Ensure the new clothing fits naturally on their body with realistic shadows, wrinkles, and fabric draping
- Match the lighting and color temperature of the original photo
- Preserve the background and overall composition
- Make the clothing appear as if it was originally worn in the photo
- For multiple items: coordinate them as a cohesive outfit
- Result should look like a professional fashion photograph, not a digital overlay
- The final image should be indistinguishable from a real photograph of the person wearing these {item_type}."""
        
        logger.debug(f"Built prompt for {item_count} items: {prompt[:100]}...")
        return prompt
