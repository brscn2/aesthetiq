"""Base classes and data structures for guardrails."""
from dataclasses import dataclass
from typing import List, Optional
from abc import ABC, abstractmethod


@dataclass
class GuardrailResult:
    """
    Result from a guardrail check.
    
    Attributes:
        is_safe: Whether the content passed all guardrail checks
        sanitized_content: The sanitized/filtered content (for input) or filtered response (for output)
        warnings: List of warning messages if any issues were detected but not blocked
        risk_score: Overall risk score (0.0 to 1.0, where 1.0 is highest risk)
        provider: Name of the provider that performed the check
        details: Additional details about the check (e.g., which specific checks failed)
    """
    is_safe: bool
    sanitized_content: str
    warnings: List[str]
    risk_score: float = 0.0
    provider: Optional[str] = None
    details: Optional[dict] = None
    
    def __post_init__(self):
        """Validate and set defaults."""
        if self.warnings is None:
            self.warnings = []
        if self.details is None:
            self.details = {}


class GuardrailProvider(ABC):
    """
    Abstract base class for guardrail providers.
    
    Each provider (llm-guard, langkit, etc.) should implement this interface.
    """
    
    @abstractmethod
    def check_input(self, text: str) -> GuardrailResult:
        """
        Check input text for safety issues.
        
        Args:
            text: The input text to check
            
        Returns:
            GuardrailResult with safety status and sanitized content
        """
        pass
    
    @abstractmethod
    def check_output(self, prompt: str, response: str) -> GuardrailResult:
        """
        Check output text for safety issues.
        
        Args:
            prompt: The original prompt that generated the response
            response: The LLM response to check
            
        Returns:
            GuardrailResult with safety status and filtered content
        """
        pass
    
    @abstractmethod
    def get_provider_name(self) -> str:
        """Get the name of this provider."""
        pass
