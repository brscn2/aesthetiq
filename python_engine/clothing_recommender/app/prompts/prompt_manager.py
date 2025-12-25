"""Prompt template management system."""
from pathlib import Path
from typing import Dict, Optional
from functools import lru_cache

from app.core.logger import get_logger

logger = get_logger(__name__)


class PromptManager:
    """
    Manages prompt templates for LLM interactions.
    
    Templates are stored as text files in app/prompts/templates/
    and can be loaded by name with optional variable substitution.
    
    Example:
        >>> pm = PromptManager()
        >>> prompt = pm.get_template("system_default")
        >>> prompt = pm.get_template("style_advisor", user_name="Alice")
    """
    
    def __init__(self, templates_dir: Optional[Path] = None):
        """
        Initialize the prompt manager.
        
        Args:
            templates_dir: Custom templates directory (defaults to app/prompts/templates)
        """
        if templates_dir is None:
            # Default to templates directory relative to this file
            self.templates_dir = Path(__file__).parent / "templates"
        else:
            self.templates_dir = Path(templates_dir)
        
        if not self.templates_dir.exists():
            logger.warning(f"Templates directory not found: {self.templates_dir}")
        
        logger.info(f"PromptManager initialized with templates: {self.templates_dir}")
    
    def get_template(self, template_name: str, **variables) -> str:
        """
        Load a prompt template by name and substitute variables.
        
        Args:
            template_name: Name of the template file (without .txt extension)
            **variables: Variables to substitute in the template using {variable_name} syntax
            
        Returns:
            Formatted prompt string
            
        Raises:
            FileNotFoundError: If template doesn't exist
            
        Example:
            >>> pm.get_template("greeting", user_name="Alice")
            "Hello Alice, how can I help you today?"
        """
        template_path = self.templates_dir / f"{template_name}.txt"
        
        if not template_path.exists():
            logger.error(f"Template not found: {template_name}")
            raise FileNotFoundError(f"Template '{template_name}' not found at {template_path}")
        
        try:
            with open(template_path, "r", encoding="utf-8") as f:
                template = f.read()
            
            # Substitute variables if provided
            if variables:
                template = template.format(**variables)
            
            logger.debug(f"Loaded template: {template_name}")
            return template
            
        except KeyError as e:
            logger.error(f"Missing variable in template {template_name}: {e}")
            raise ValueError(f"Template '{template_name}' requires variable: {e}")
        except Exception as e:
            logger.error(f"Error loading template {template_name}: {e}")
            raise
    
    def list_templates(self) -> list[str]:
        """
        List all available template names.
        
        Returns:
            List of template names (without .txt extension)
        """
        if not self.templates_dir.exists():
            return []
        
        templates = [
            f.stem for f in self.templates_dir.glob("*.txt")
        ]
        
        logger.debug(f"Found {len(templates)} templates")
        return sorted(templates)
    
    def template_exists(self, template_name: str) -> bool:
        """
        Check if a template exists.
        
        Args:
            template_name: Name of the template (without .txt extension)
            
        Returns:
            True if template exists, False otherwise
        """
        template_path = self.templates_dir / f"{template_name}.txt"
        return template_path.exists()
    
    def get_template_safe(
        self, 
        template_name: str, 
        default: Optional[str] = None,
        **variables
    ) -> str:
        """
        Load a template with fallback to default if not found.
        
        Args:
            template_name: Name of the template
            default: Default text to return if template not found
            **variables: Variables to substitute
            
        Returns:
            Formatted prompt or default value
        """
        try:
            return self.get_template(template_name, **variables)
        except (FileNotFoundError, ValueError) as e:
            logger.warning(f"Using default for template {template_name}: {e}")
            return default or ""


# Global instance for easy access
_prompt_manager: Optional[PromptManager] = None


def get_prompt_manager() -> PromptManager:
    """
    Get the global PromptManager instance (singleton pattern).
    
    Returns:
        PromptManager instance
    """
    global _prompt_manager
    if _prompt_manager is None:
        _prompt_manager = PromptManager()
    return _prompt_manager
