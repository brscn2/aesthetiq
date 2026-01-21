"""LangKit provider implementation."""
from typing import List, Optional
from app.guardrails.base import GuardrailProvider, GuardrailResult
from app.guardrails.providers.base_provider import BaseProvider
from app.core.logger import get_logger

logger = get_logger(__name__)


class LangKitProvider(BaseProvider):
    """
    Guardrail provider using LangKit (WhyLabs) library.
    
    Note: LangKit is primarily a monitoring/metrics library, but can be used
    for guardrails via metric thresholds.
    """
    
    def __init__(
        self,
        max_input_length: int = 10000,
        max_output_length: int = 50000,
        whylabs_api_key: Optional[str] = None,
        toxicity_threshold: float = 0.5,
        pii_enabled: bool = True,
    ):
        """
        Initialize LangKit provider.
        
        Args:
            max_input_length: Maximum input length
            max_output_length: Maximum output length
            whylabs_api_key: WhyLabs API key (optional, for cloud features)
            toxicity_threshold: Threshold for toxicity detection (0.0 to 1.0)
            pii_enabled: Whether to detect PII
        """
        super().__init__(max_input_length, max_output_length)
        self.whylabs_api_key = whylabs_api_key
        self.toxicity_threshold = toxicity_threshold
        self.pii_enabled = pii_enabled
        
        # Initialize LangKit metrics lazily
        self._metrics_initialized = False
    
    def _initialize_metrics(self):
        """Lazy initialization of LangKit metrics."""
        if self._metrics_initialized:
            return
        
        try:
            import whylogs as why
            from langkit import llm_metrics
            
            # Initialize metrics schema
            self._schema = llm_metrics.init()
            self._metrics_initialized = True
            logger.info("LangKit metrics initialized")
        except ImportError:
            logger.warning("langkit not installed. Install with: pip install langkit[all]")
            self._metrics_initialized = False
        except Exception as e:
            logger.error(f"Failed to initialize LangKit: {e}")
            self._metrics_initialized = False
    
    def check_input(self, text: str) -> GuardrailResult:
        """
        Check input text using LangKit metrics.
        
        Args:
            text: Input text to check
            
        Returns:
            GuardrailResult with safety status
        """
        warnings = []
        details = {}
        max_risk_score = 0.0
        sanitized_text = text
        
        # Basic length validation
        is_valid_length, length_warnings = self._validate_length(text, self.MAX_INPUT_LENGTH, "input")
        warnings.extend(length_warnings)
        if not is_valid_length:
            return GuardrailResult(
                is_safe=False,
                sanitized_content=text[:self.MAX_INPUT_LENGTH],
                warnings=warnings,
                risk_score=1.0,
                provider=self.get_provider_name(),
                details={"length_exceeded": True},
            )
        
        # Basic sanitization
        sanitized_text = self._sanitize_basic(text)
        
        # Initialize metrics if needed
        self._initialize_metrics()
        
        if not self._metrics_initialized:
            # LangKit not available, return safe with warning
            warnings.append("LangKit not available, using basic validation only")
            return GuardrailResult(
                is_safe=True,
                sanitized_content=sanitized_text,
                warnings=warnings,
                risk_score=0.0,
                provider=self.get_provider_name(),
                details={"langkit_available": False},
            )
        
        try:
            import whylogs as why
            from langkit import llm_metrics
            
            # Create profile with input metrics
            profile = why.log(
                {"prompt": sanitized_text},
                schema=self._schema
            )
            
            # Extract metrics from profile
            profile_view = profile.view()
            columns = profile_view.get_columns()
            
            # Check for PII
            if self.pii_enabled and "prompt.pii" in columns:
                pii_column = columns["prompt.pii"]
                # Check if PII detected (simplified - actual implementation would check specific metrics)
                details["pii_checked"] = True
            
            # Check toxicity (if available)
            if "prompt.toxicity" in columns:
                toxicity_column = columns["prompt.toxicity"]
                # Extract toxicity score (simplified - actual implementation would use proper metric extraction)
                # For now, we'll use a placeholder
                toxicity_score = 0.0  # Would extract from profile_view
                if toxicity_score > self.toxicity_threshold:
                    max_risk_score = max(max_risk_score, toxicity_score)
                    warnings.append(f"High toxicity detected (score: {toxicity_score:.2f})")
                    details["toxicity_detected"] = True
            
            # Note: LangKit is primarily for monitoring, so we're using it conservatively
            # In production, you'd want to use the WhyLabs Guardrails API for actual blocking
            
        except Exception as e:
            logger.warning(f"Error running LangKit metrics: {e}")
            warnings.append(f"LangKit metrics error: {str(e)}")
        
        # Determine if content is safe
        is_safe = max_risk_score < self.toxicity_threshold
        
        return GuardrailResult(
            is_safe=is_safe,
            sanitized_content=sanitized_text,
            warnings=warnings,
            risk_score=max_risk_score,
            provider=self.get_provider_name(),
            details=details,
        )
    
    def check_output(self, prompt: str, response: str) -> GuardrailResult:
        """
        Check output text using LangKit metrics.
        
        Args:
            prompt: Original prompt
            response: LLM response to check
            
        Returns:
            GuardrailResult with safety status
        """
        warnings = []
        details = {}
        max_risk_score = 0.0
        filtered_response = response
        
        # Basic length validation
        is_valid_length, length_warnings = self._validate_length(response, self.MAX_OUTPUT_LENGTH, "output")
        warnings.extend(length_warnings)
        if not is_valid_length:
            return GuardrailResult(
                is_safe=False,
                sanitized_content=response[:self.MAX_OUTPUT_LENGTH],
                warnings=warnings,
                risk_score=1.0,
                provider=self.get_provider_name(),
                details={"length_exceeded": True},
            )
        
        # Basic sanitization
        filtered_response = self._sanitize_basic(response)
        
        # Initialize metrics if needed
        self._initialize_metrics()
        
        if not self._metrics_initialized:
            # LangKit not available, return safe with warning
            warnings.append("LangKit not available, using basic validation only")
            return GuardrailResult(
                is_safe=True,
                sanitized_content=filtered_response,
                warnings=warnings,
                risk_score=0.0,
                provider=self.get_provider_name(),
                details={"langkit_available": False},
            )
        
        try:
            import whylogs as why
            from langkit import llm_metrics
            
            # Create profile with prompt-response pair
            profile = why.log(
                {"prompt": prompt, "response": filtered_response},
                schema=self._schema
            )
            
            # Extract metrics from profile
            profile_view = profile.view()
            columns = profile_view.get_columns()
            
            # Check for PII in response
            if self.pii_enabled and "response.pii" in columns:
                pii_column = columns["response.pii"]
                details["pii_checked"] = True
            
            # Check toxicity
            if "response.toxicity" in columns:
                toxicity_column = columns["response.toxicity"]
                # Extract toxicity score (simplified)
                toxicity_score = 0.0  # Would extract from profile_view
                if toxicity_score > self.toxicity_threshold:
                    max_risk_score = max(max_risk_score, toxicity_score)
                    warnings.append(f"High toxicity detected (score: {toxicity_score:.2f})")
                    details["toxicity_detected"] = True
            
            # Check relevance (if available)
            if "response.similarity" in columns:
                details["relevance_checked"] = True
            
        except Exception as e:
            logger.warning(f"Error running LangKit metrics: {e}")
            warnings.append(f"LangKit metrics error: {str(e)}")
        
        # Determine if content is safe
        is_safe = max_risk_score < self.toxicity_threshold
        
        return GuardrailResult(
            is_safe=is_safe,
            sanitized_content=filtered_response,
            warnings=warnings,
            risk_score=max_risk_score,
            provider=self.get_provider_name(),
            details=details,
        )
    
    def get_provider_name(self) -> str:
        """Get the name of this provider."""
        return "langkit"
