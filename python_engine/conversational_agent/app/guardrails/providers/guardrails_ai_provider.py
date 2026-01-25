"""Guardrails AI provider implementation for prompt injection and toxic content detection."""
import re
from typing import Optional, List, Tuple
from app.guardrails.base import GuardrailResult
from app.guardrails.providers.base_provider import BaseProvider
from app.core.logger import get_logger

logger = get_logger(__name__)

# Common prompt injection patterns for fallback detection
PROMPT_INJECTION_PATTERNS = [
    r"ignore\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?|rules?)",
    r"disregard\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?|rules?)",
    r"forget\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?|rules?)",
    r"you\s+are\s+now\s+(DAN|jailbroken|unfiltered|evil)",
    r"pretend\s+(to\s+be|you\s+are)\s+(a\s+)?different",
    r"act\s+as\s+(if\s+you\s+were|a)\s+(different|new)",
    r"new\s+(system\s+)?instructions?:",
    r"override\s+(system|previous)\s+(prompt|instructions?)",
    r"system\s+prompt:\s*",
    r"\[system\]",
    r"<system>",
    r"###\s*(system|instruction)",
    r"bypass\s+(safety|content|filter)",
    r"jailbreak",
    r"developer\s+mode",
    r"do\s+anything\s+now",
    r"evil\s+mode",
]

# Toxic/harmful content patterns for fallback detection
TOXIC_PATTERNS = [
    r"\b(kill|murder|harm|hurt|attack|destroy)\s+(yourself|myself|them|people|someone)\b",
    r"\b(suicide|self.harm)\b",
    r"\bhow\s+to\s+(make|build|create)\s+(a\s+)?(bomb|weapon|explosive|poison)\b",
    r"\b(make|build|create)\s+(a\s+)?(bomb|weapon|explosive|poison)\b",
    r"\b(bomb|explosive|weapon)\s+(making|building|creation|instructions?)\b",
    r"\b(hate|racist|sexist|homophobic)\b",
    r"\b(slur|offensive\s+term)\b",
    r"\bhow\s+to\s+hurt\b",
    r"\bhow\s+to\s+harm\b",
]


class GuardrailsAIProvider(BaseProvider):
    """
    Guardrail provider using Guardrails AI library.
    
    Focuses on:
    - Prompt injection detection
    - Toxic/harmful content blocking
    
    Falls back to pattern-based detection if Hub validators are not installed.
    """
    
    def __init__(
        self,
        max_input_length: int = 10000,
        max_output_length: int = 50000,
        toxic_threshold: float = 0.5,
    ):
        """
        Initialize Guardrails AI provider.
        
        Args:
            max_input_length: Maximum input length
            max_output_length: Maximum output length
            toxic_threshold: Threshold for toxic content detection (0.0 to 1.0)
        """
        super().__init__(max_input_length, max_output_length)
        self.toxic_threshold = toxic_threshold
        
        # Initialize guards lazily
        self._input_guard = None
        self._output_guard = None
        self._initialization_error = None
        self._using_fallback = False
        
        # Compile regex patterns for fallback
        self._prompt_injection_patterns = [
            re.compile(pattern, re.IGNORECASE) for pattern in PROMPT_INJECTION_PATTERNS
        ]
        self._toxic_patterns = [
            re.compile(pattern, re.IGNORECASE) for pattern in TOXIC_PATTERNS
        ]
    
    def _get_input_guard(self):
        """Lazy initialization of input guard with validators."""
        if self._input_guard is None and self._initialization_error is None:
            try:
                from guardrails import Guard
                from guardrails.hub import DetectPromptInjection, ToxicLanguage
                
                self._input_guard = Guard()
                self._input_guard.use_many(
                    DetectPromptInjection(on_fail="exception"),
                    ToxicLanguage(threshold=self.toxic_threshold, on_fail="exception"),
                )
                logger.info("Initialized Guardrails AI input guard with DetectPromptInjection and ToxicLanguage validators")
                
            except ImportError as e:
                self._initialization_error = f"Hub validators not installed: {e}"
                self._using_fallback = True
                logger.warning(f"Guardrails Hub validators not available, using pattern-based fallback: {e}")
                logger.info("To install Hub validators: guardrails configure && guardrails hub install hub://guardrails/detect_prompt_injection hub://guardrails/toxic_language")
            except Exception as e:
                self._initialization_error = f"Failed to initialize Guardrails AI: {e}"
                self._using_fallback = True
                logger.warning(f"Guardrails AI initialization failed, using pattern-based fallback: {e}")
        
        return self._input_guard
    
    def _get_output_guard(self):
        """Lazy initialization of output guard with validators."""
        if self._output_guard is None and self._initialization_error is None:
            try:
                from guardrails import Guard
                from guardrails.hub import ToxicLanguage
                
                # Output guard only checks for toxic content (not prompt injection)
                self._output_guard = Guard()
                self._output_guard.use(
                    ToxicLanguage(threshold=self.toxic_threshold, on_fail="exception"),
                )
                logger.info("Initialized Guardrails AI output guard with ToxicLanguage validator")
                
            except ImportError as e:
                if self._initialization_error is None:
                    self._initialization_error = f"Hub validators not installed: {e}"
                    self._using_fallback = True
                    logger.warning(f"Guardrails Hub validators not available, using pattern-based fallback: {e}")
            except Exception as e:
                if self._initialization_error is None:
                    self._initialization_error = f"Failed to initialize Guardrails AI: {e}"
                    self._using_fallback = True
                    logger.warning(f"Guardrails AI initialization failed, using pattern-based fallback: {e}")
        
        return self._output_guard
    
    def _check_prompt_injection_patterns(self, text: str) -> Tuple[bool, List[str]]:
        """
        Fallback pattern-based prompt injection detection.
        
        Args:
            text: Text to check
            
        Returns:
            Tuple of (is_injection_detected, list_of_matched_patterns)
        """
        matched_patterns = []
        text_lower = text.lower()
        
        for pattern in self._prompt_injection_patterns:
            if pattern.search(text_lower):
                matched_patterns.append(pattern.pattern)
        
        return len(matched_patterns) > 0, matched_patterns
    
    def _check_toxic_patterns(self, text: str) -> Tuple[bool, List[str]]:
        """
        Fallback pattern-based toxic content detection.
        
        Args:
            text: Text to check
            
        Returns:
            Tuple of (is_toxic_detected, list_of_matched_patterns)
        """
        matched_patterns = []
        text_lower = text.lower()
        
        for pattern in self._toxic_patterns:
            if pattern.search(text_lower):
                matched_patterns.append(pattern.pattern)
        
        return len(matched_patterns) > 0, matched_patterns
    
    def _fallback_check_input(self, text: str) -> GuardrailResult:
        """
        Pattern-based fallback for input checking when Hub validators aren't available.
        
        Args:
            text: Text to check
            
        Returns:
            GuardrailResult
        """
        warnings = []
        details = {"fallback_mode": True}
        
        # Check for prompt injection
        is_injection, injection_patterns = self._check_prompt_injection_patterns(text)
        if is_injection:
            details["prompt_injection_detected"] = True
            details["matched_patterns"] = injection_patterns
            warnings.append("Potential prompt injection attempt detected")
            logger.warning(f"Fallback detected prompt injection patterns: {injection_patterns[:3]}")
            return GuardrailResult(
                is_safe=False,
                sanitized_content=text,
                warnings=warnings,
                risk_score=1.0,
                provider=self.get_provider_name(),
                details=details,
            )
        
        # Check for toxic content
        is_toxic, toxic_patterns = self._check_toxic_patterns(text)
        if is_toxic:
            details["toxic_content_detected"] = True
            details["matched_patterns"] = toxic_patterns
            warnings.append("Potentially harmful or inappropriate content detected")
            logger.warning(f"Fallback detected toxic patterns: {toxic_patterns[:3]}")
            return GuardrailResult(
                is_safe=False,
                sanitized_content=text,
                warnings=warnings,
                risk_score=0.8,
                provider=self.get_provider_name(),
                details=details,
            )
        
        return GuardrailResult(
            is_safe=True,
            sanitized_content=text,
            warnings=warnings,
            risk_score=0.0,
            provider=self.get_provider_name(),
            details=details,
        )
    
    def check_input(self, text: str) -> GuardrailResult:
        """
        Check input text for prompt injection and toxic content.
        
        Args:
            text: Input text to check
            
        Returns:
            GuardrailResult with safety status
        """
        warnings = []
        details = {}
        
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
        
        # Try to get the input guard (this sets _using_fallback if needed)
        guard = self._get_input_guard()
        
        # Use fallback pattern-based detection if Hub validators aren't available
        if guard is None or self._using_fallback:
            fallback_result = self._fallback_check_input(sanitized_text)
            # Add a note that we're using fallback mode
            if "Hub validators not installed" in str(self._initialization_error):
                fallback_result.warnings.append(
                    "Using pattern-based fallback. Install Hub validators for ML-powered detection."
                )
            return fallback_result
        
        # Run Guardrails AI validation with Hub validators
        try:
            result = guard.validate(sanitized_text)
            
            is_safe = result.validation_passed
            validated_output = result.validated_output if result.validated_output else sanitized_text
            
            # Extract any validation summaries
            if hasattr(result, 'validation_summaries') and result.validation_summaries:
                for summary in result.validation_summaries:
                    details[f"validator_{summary}"] = "failed"
            
            if not is_safe:
                details["blocked"] = True
                warnings.append("Content blocked by Guardrails AI validators")
            
            details["hub_validators"] = True
            
            return GuardrailResult(
                is_safe=is_safe,
                sanitized_content=validated_output,
                warnings=warnings,
                risk_score=0.0 if is_safe else 1.0,
                provider=self.get_provider_name(),
                details=details,
            )
            
        except Exception as e:
            # Validation failed (exception on_fail triggers this)
            error_message = str(e)
            details["validation_exception"] = error_message
            details["hub_validators"] = True
            
            # Determine what type of violation occurred
            if "prompt injection" in error_message.lower():
                details["prompt_injection_detected"] = True
                warnings.append("Prompt injection attempt detected")
            elif "toxic" in error_message.lower():
                details["toxic_content_detected"] = True
                warnings.append("Toxic or harmful content detected")
            else:
                warnings.append(f"Content blocked: {error_message}")
            
            logger.warning(f"Guardrails AI blocked input: {error_message}")
            
            return GuardrailResult(
                is_safe=False,
                sanitized_content=sanitized_text,
                warnings=warnings,
                risk_score=1.0,
                provider=self.get_provider_name(),
                details=details,
            )
    
    def _fallback_check_output(self, response: str) -> GuardrailResult:
        """
        Pattern-based fallback for output checking when Hub validators aren't available.
        
        Args:
            response: Response text to check
            
        Returns:
            GuardrailResult
        """
        warnings = []
        details = {"fallback_mode": True}
        
        # Check for toxic content only (no prompt injection check for outputs)
        is_toxic, toxic_patterns = self._check_toxic_patterns(response)
        if is_toxic:
            details["toxic_content_detected"] = True
            details["matched_patterns"] = toxic_patterns
            warnings.append("Potentially harmful or inappropriate content detected in output")
            logger.warning(f"Fallback detected toxic patterns in output: {toxic_patterns[:3]}")
            return GuardrailResult(
                is_safe=False,
                sanitized_content=response,
                warnings=warnings,
                risk_score=0.8,
                provider=self.get_provider_name(),
                details=details,
            )
        
        return GuardrailResult(
            is_safe=True,
            sanitized_content=response,
            warnings=warnings,
            risk_score=0.0,
            provider=self.get_provider_name(),
            details=details,
        )
    
    def check_output(self, prompt: str, response: str) -> GuardrailResult:
        """
        Check output text for toxic content.
        
        Args:
            prompt: Original prompt
            response: LLM response to check
            
        Returns:
            GuardrailResult with safety status
        """
        warnings = []
        details = {}
        
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
        sanitized_response = self._sanitize_basic(response)
        
        # Try to get the output guard (this sets _using_fallback if needed)
        guard = self._get_output_guard()
        
        # Use fallback pattern-based detection if Hub validators aren't available
        if guard is None or self._using_fallback:
            fallback_result = self._fallback_check_output(sanitized_response)
            if "Hub validators not installed" in str(self._initialization_error):
                fallback_result.warnings.append(
                    "Using pattern-based fallback. Install Hub validators for ML-powered detection."
                )
            return fallback_result
        
        # Run Guardrails AI validation with Hub validators
        try:
            result = guard.validate(sanitized_response)
            
            is_safe = result.validation_passed
            validated_output = result.validated_output if result.validated_output else sanitized_response
            
            if not is_safe:
                details["blocked"] = True
                warnings.append("Output blocked by Guardrails AI validators")
            
            details["hub_validators"] = True
            
            return GuardrailResult(
                is_safe=is_safe,
                sanitized_content=validated_output,
                warnings=warnings,
                risk_score=0.0 if is_safe else 1.0,
                provider=self.get_provider_name(),
                details=details,
            )
            
        except Exception as e:
            # Validation failed (exception on_fail triggers this)
            error_message = str(e)
            details["validation_exception"] = error_message
            details["hub_validators"] = True
            
            if "toxic" in error_message.lower():
                details["toxic_content_detected"] = True
                warnings.append("Toxic or harmful content detected in output")
            else:
                warnings.append(f"Output blocked: {error_message}")
            
            logger.warning(f"Guardrails AI blocked output: {error_message}")
            
            return GuardrailResult(
                is_safe=False,
                sanitized_content=sanitized_response,
                warnings=warnings,
                risk_score=1.0,
                provider=self.get_provider_name(),
                details=details,
            )
    
    def get_provider_name(self) -> str:
        """Get the name of this provider."""
        return "guardrails-ai"
