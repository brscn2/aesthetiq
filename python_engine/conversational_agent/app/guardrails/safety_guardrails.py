"""Safety guardrails class using Guardrails AI provider."""
from typing import List, Optional
from app.guardrails.base import GuardrailProvider, GuardrailResult
from app.guardrails.providers.guardrails_ai_provider import GuardrailsAIProvider
from app.core.config import get_settings
from app.core.logger import get_logger

logger = get_logger(__name__)


class SafetyGuardrails:
    """
    Safety guardrails using Guardrails AI for prompt injection and toxic content detection.
    
    Uses pattern-based fallback when Hub validators aren't installed.
    """
    
    def __init__(
        self,
        providers: Optional[List[str]] = None,
        max_input_length: int = 10000,
        max_output_length: int = 50000,
    ):
        """
        Initialize safety guardrails.
        
        Args:
            providers: List of provider names (only "guardrails-ai" supported)
                      If None, will use GUARDRAIL_PROVIDERS from environment
            max_input_length: Maximum input length
            max_output_length: Maximum output length
        """
        settings = get_settings()
        
        # Get providers from env if not specified
        if providers is None:
            providers_str = getattr(settings, "GUARDRAIL_PROVIDERS", "guardrails-ai")
            providers = [p.strip() for p in providers_str.split(",") if p.strip()]
        
        self.providers: List[GuardrailProvider] = []
        
        # Initialize each provider
        for provider_name in providers:
            try:
                provider = self._create_provider(
                    provider_name,
                    max_input_length,
                    max_output_length,
                    settings,
                )
                if provider:
                    self.providers.append(provider)
                    logger.info(f"Initialized guardrail provider: {provider_name}")
            except Exception as e:
                logger.error(f"Failed to initialize provider {provider_name}: {e}")
        
        if not self.providers:
            logger.warning("No guardrail providers initialized, using basic validation only")
    
    def _create_provider(
        self,
        provider_name: str,
        max_input_length: int,
        max_output_length: int,
        settings,
    ) -> Optional[GuardrailProvider]:
        """
        Create a provider instance based on name.
        
        Args:
            provider_name: Name of the provider (only "guardrails-ai" supported)
            max_input_length: Maximum input length
            max_output_length: Maximum output length
            settings: Application settings
            
        Returns:
            Provider instance or None if creation failed
        """
        provider_name_lower = provider_name.lower().strip()
        
        if provider_name_lower == "guardrails-ai" or provider_name_lower == "guardrailsai":
            toxic_threshold = float(getattr(settings, "GUARDRAILS_AI_THRESHOLD", 0.5))
            
            return GuardrailsAIProvider(
                max_input_length=max_input_length,
                max_output_length=max_output_length,
                toxic_threshold=toxic_threshold,
            )
        
        else:
            logger.warning(f"Unknown guardrail provider: {provider_name}. Only 'guardrails-ai' is supported.")
            return None
    
    def check_input(self, text: str) -> GuardrailResult:
        """
        Check input text using all configured providers.
        
        If multiple providers are configured, all must pass for content to be safe.
        The most restrictive result (highest risk score) is returned.
        
        Args:
            text: Input text to check
            
        Returns:
            GuardrailResult with safety status and sanitized content
        """
        if not self.providers:
            # No providers, return basic validation
            from app.guardrails.providers.base_provider import BaseProvider
            base_provider = BaseProvider()
            is_valid, warnings = base_provider._validate_length(text, base_provider.MAX_INPUT_LENGTH, "input")
            sanitized = base_provider._sanitize_basic(text)
            
            return GuardrailResult(
                is_safe=is_valid,
                sanitized_content=sanitized,
                warnings=warnings,
                risk_score=0.0 if is_valid else 1.0,
                provider="base",
            )
        
        # Run all providers
        results = []
        for provider in self.providers:
            try:
                result = provider.check_input(text)
                results.append(result)
                logger.debug(f"Provider {provider.get_provider_name()} input check: safe={result.is_safe}, risk={result.risk_score:.2f}")
            except Exception as e:
                logger.error(f"Error in provider {provider.get_provider_name()}: {e}")
                # On error, create a safe result with warning
                results.append(GuardrailResult(
                    is_safe=True,
                    sanitized_content=text,
                    warnings=[f"Provider {provider.get_provider_name()} error: {str(e)}"],
                    risk_score=0.0,
                    provider=provider.get_provider_name(),
                ))
        
        # Combine results: content is safe only if ALL providers say it's safe
        # Use the most restrictive result (highest risk, most warnings)
        combined_result = results[0] if results else GuardrailResult(
            is_safe=True,
            sanitized_content=text,
            warnings=[],
            risk_score=0.0,
            provider="none",
        )
        
        for result in results[1:]:
            # Combine safety: all must be safe
            combined_result.is_safe = combined_result.is_safe and result.is_safe
            
            # Use highest risk score
            if result.risk_score > combined_result.risk_score:
                combined_result.risk_score = result.risk_score
            
            # Combine warnings
            combined_result.warnings.extend(result.warnings)
            
            # Use most sanitized content (if one provider sanitized more)
            if len(result.sanitized_content) < len(combined_result.sanitized_content):
                combined_result.sanitized_content = result.sanitized_content
            
            # Combine details
            if result.details:
                if combined_result.details is None:
                    combined_result.details = {}
                combined_result.details.update(result.details)
        
        # Set provider name to indicate multiple providers
        if len(results) > 1:
            combined_result.provider = f"combined({','.join(r.provider for r in results)})"
        else:
            combined_result.provider = combined_result.provider or "unknown"
        
        return combined_result
    
    def check_output(self, prompt: str, response: str) -> GuardrailResult:
        """
        Check output text using all configured providers.
        
        If multiple providers are configured, all must pass for content to be safe.
        The most restrictive result (highest risk score) is returned.
        
        Args:
            prompt: Original prompt
            response: LLM response to check
            
        Returns:
            GuardrailResult with safety status and filtered content
        """
        if not self.providers:
            # No providers, return basic validation
            from app.guardrails.providers.base_provider import BaseProvider
            base_provider = BaseProvider()
            is_valid, warnings = base_provider._validate_length(response, base_provider.MAX_OUTPUT_LENGTH, "output")
            sanitized = base_provider._sanitize_basic(response)
            
            return GuardrailResult(
                is_safe=True,
                sanitized_content=sanitized,
                warnings=warnings,
                risk_score=0.0 if is_valid else 1.0,
                provider="base",
            )
            return GuardrailResult(
                is_safe=is_valid,
                sanitized_content=sanitized,
                warnings=warnings,
                risk_score=0.0 if is_valid else 1.0,
                provider="base",
            )
        
        # Run all providers
        results = []
        for provider in self.providers:
            try:
                result = provider.check_output(prompt, response)
                results.append(result)
                logger.debug(f"Provider {provider.get_provider_name()} output check: safe={result.is_safe}, risk={result.risk_score:.2f}")
            except Exception as e:
                logger.error(f"Error in provider {provider.get_provider_name()}: {e}")
                # On error, create a safe result with warning
                results.append(GuardrailResult(
                    is_safe=True,
                    sanitized_content=response,
                    warnings=[f"Provider {provider.get_provider_name()} error: {str(e)}"],
                    risk_score=0.0,
                    provider=provider.get_provider_name(),
                ))
        
        # Combine results: content is safe only if ALL providers say it's safe
        combined_result = results[0] if results else GuardrailResult(
            is_safe=True,
            sanitized_content=response,
            warnings=[],
            risk_score=0.0,
            provider="none",
        )
        
        for result in results[1:]:
            # Combine safety: all must be safe
            combined_result.is_safe = combined_result.is_safe and result.is_safe
            
            # Use highest risk score
            if result.risk_score > combined_result.risk_score:
                combined_result.risk_score = result.risk_score
            
            # Combine warnings
            combined_result.warnings.extend(result.warnings)
            
            # Use most filtered content (if one provider filtered more)
            if len(result.sanitized_content) < len(combined_result.sanitized_content):
                combined_result.sanitized_content = result.sanitized_content
            
            # Combine details
            if result.details:
                if combined_result.details is None:
                    combined_result.details = {}
                combined_result.details.update(result.details)
        
        # Set provider name to indicate multiple providers
        if len(results) > 1:
            combined_result.provider = f"combined({','.join(r.provider for r in results)})"
        else:
            combined_result.provider = combined_result.provider or "unknown"
        
        return combined_result


# Global instance
_safety_guardrails: Optional[SafetyGuardrails] = None


def get_safety_guardrails() -> SafetyGuardrails:
    """
    Get the global safety guardrails instance.
    
    Returns:
        SafetyGuardrails instance
    """
    global _safety_guardrails
    
    if _safety_guardrails is None:
        _safety_guardrails = SafetyGuardrails()
    
    return _safety_guardrails
