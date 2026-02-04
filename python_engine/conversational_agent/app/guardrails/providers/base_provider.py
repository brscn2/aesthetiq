"""Base provider implementation with common functionality."""
from app.guardrails.base import GuardrailProvider, GuardrailResult
from typing import List


class BaseProvider(GuardrailProvider):
    """
    Base provider with common guardrail functionality.
    
    This provides basic checks that all providers should support:
    - Length validation
    - Basic sanitization
    """
    
    MAX_INPUT_LENGTH: int = 10000
    MAX_OUTPUT_LENGTH: int = 50000
    
    def __init__(self, max_input_length: int = None, max_output_length: int = None):
        """
        Initialize base provider.
        
        Args:
            max_input_length: Maximum allowed input length (default: 10000)
            max_output_length: Maximum allowed output length (default: 50000)
        """
        if max_input_length is not None:
            self.MAX_INPUT_LENGTH = max_input_length
        if max_output_length is not None:
            self.MAX_OUTPUT_LENGTH = max_output_length
    
    def _validate_length(self, text: str, max_length: int, content_type: str = "input") -> tuple:
        """
        Validate text length.
        
        Args:
            text: Text to validate
            max_length: Maximum allowed length
            content_type: "input" or "output"
            
        Returns:
            Tuple of (is_valid, warnings)
        """
        warnings = []
        if len(text) > max_length:
            warnings.append(f"{content_type.capitalize()} exceeds maximum length ({len(text)} > {max_length})")
            return False, warnings
        return True, warnings
    
    def _sanitize_basic(self, text: str) -> str:
        """
        Basic text sanitization (remove null bytes, normalize whitespace).
        
        Args:
            text: Text to sanitize
            
        Returns:
            Sanitized text
        """
        # Remove null bytes
        text = text.replace('\x00', '')
        # Normalize whitespace (replace multiple spaces/tabs/newlines with single space)
        import re
        text = re.sub(r'\s+', ' ', text)
        return text.strip()

    def check_input(self, text: str) -> GuardrailResult:
        """Check input: length validation and basic sanitization only (no safety blocking)."""
        is_valid, warnings = self._validate_length(text, self.MAX_INPUT_LENGTH, "input")
        sanitized = self._sanitize_basic(text)
        return GuardrailResult(
            is_safe=is_valid,
            sanitized_content=sanitized,
            warnings=warnings,
            risk_score=0.0 if is_valid else 1.0,
            provider="base",
        )

    def check_output(self, prompt: str, response: str) -> GuardrailResult:
        """Check output: length validation and basic sanitization only (no safety blocking)."""
        is_valid, warnings = self._validate_length(response, self.MAX_OUTPUT_LENGTH, "output")
        sanitized = self._sanitize_basic(response)
        return GuardrailResult(
            is_safe=is_valid,
            sanitized_content=sanitized,
            warnings=warnings,
            risk_score=0.0 if is_valid else 1.0,
            provider="base",
        )

    def get_provider_name(self) -> str:
        """Get the name of this provider."""
        return "base"
