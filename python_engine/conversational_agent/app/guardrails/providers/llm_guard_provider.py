"""LLM Guard provider implementation."""
from typing import List, Optional
from app.guardrails.base import GuardrailProvider, GuardrailResult
from app.guardrails.providers.base_provider import BaseProvider
from app.core.logger import get_logger

logger = get_logger(__name__)


class LLMGuardProvider(BaseProvider):
    """
    Guardrail provider using llm-guard library.
    
    Supports various scanners for input and output validation.
    """
    
    def __init__(
        self,
        max_input_length: int = 10000,
        max_output_length: int = 50000,
        input_scanners: Optional[List[str]] = None,
        output_scanners: Optional[List[str]] = None,
        threshold: float = 0.5,
    ):
        """
        Initialize LLM Guard provider.
        
        Args:
            max_input_length: Maximum input length
            max_output_length: Maximum output length
            input_scanners: List of input scanner names to use (e.g., ["prompt_injection", "toxicity"])
            output_scanners: List of output scanner names to use (e.g., ["toxicity", "relevance"])
            threshold: Risk threshold (0.0 to 1.0) for blocking content
        """
        super().__init__(max_input_length, max_output_length)
        self.threshold = threshold
        self.input_scanners = input_scanners or ["prompt_injection", "toxicity"]
        self.output_scanners = output_scanners or ["toxicity", "relevance"]
        
        # Initialize scanners lazily
        self._input_scanner_instances = None
        self._output_scanner_instances = None
    
    def _get_input_scanners(self):
        """Lazy initialization of input scanners."""
        if self._input_scanner_instances is None:
            try:
                from llm_guard.input_scanners import (
                    PromptInjection,
                    Toxicity,
                    BanTopics,
                    PII,
                )
                
                scanners = []
                scanner_map = {
                    "prompt_injection": PromptInjection,
                    "toxicity": Toxicity,
                    "ban_topics": BanTopics,
                    "pii": PII,
                }
                
                for scanner_name in self.input_scanners:
                    if scanner_name in scanner_map:
                        try:
                            scanner_class = scanner_map[scanner_name]
                            if scanner_name == "prompt_injection":
                                scanners.append(scanner_class(threshold=self.threshold))
                            elif scanner_name == "toxicity":
                                scanners.append(scanner_class(threshold=self.threshold))
                            elif scanner_name == "ban_topics":
                                scanners.append(scanner_class(topics=["violence", "hate", "self-harm"]))
                            elif scanner_name == "pii":
                                scanners.append(scanner_class(redact=True))
                            else:
                                scanners.append(scanner_class())
                            logger.info(f"Initialized LLM Guard input scanner: {scanner_name}")
                        except Exception as e:
                            logger.warning(f"Failed to initialize scanner {scanner_name}: {e}")
                    else:
                        logger.warning(f"Unknown input scanner: {scanner_name}")
                
                self._input_scanner_instances = scanners
            except ImportError:
                logger.error("llm-guard not installed. Install with: pip install llm-guard")
                self._input_scanner_instances = []
        
        return self._input_scanner_instances
    
    def _get_output_scanners(self):
        """Lazy initialization of output scanners."""
        if self._output_scanner_instances is None:
            try:
                from llm_guard.output_scanners import (
                    Toxicity,
                    Relevance,
                    BanTopics,
                    PII,
                )
                
                scanners = []
                scanner_map = {
                    "toxicity": Toxicity,
                    "relevance": Relevance,
                    "ban_topics": BanTopics,
                    "pii": PII,
                }
                
                for scanner_name in self.output_scanners:
                    if scanner_name in scanner_map:
                        try:
                            scanner_class = scanner_map[scanner_name]
                            if scanner_name == "toxicity":
                                scanners.append(scanner_class(threshold=self.threshold))
                            elif scanner_name == "relevance":
                                scanners.append(scanner_class(threshold=self.threshold))
                            elif scanner_name == "ban_topics":
                                scanners.append(scanner_class(topics=["violence", "hate", "self-harm"]))
                            elif scanner_name == "pii":
                                scanners.append(scanner_class(redact=True))
                            else:
                                scanners.append(scanner_class())
                            logger.info(f"Initialized LLM Guard output scanner: {scanner_name}")
                        except Exception as e:
                            logger.warning(f"Failed to initialize scanner {scanner_name}: {e}")
                    else:
                        logger.warning(f"Unknown output scanner: {scanner_name}")
                
                self._output_scanner_instances = scanners
            except ImportError:
                logger.error("llm-guard not installed. Install with: pip install llm-guard")
                self._output_scanner_instances = []
        
        return self._output_scanner_instances
    
    def check_input(self, text: str) -> GuardrailResult:
        """
        Check input text using LLM Guard scanners.
        
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
        
        # Run LLM Guard scanners
        scanners = self._get_input_scanners()
        if not scanners:
            # No scanners available, return safe with warning
            warnings.append("LLM Guard scanners not available, using basic validation only")
            return GuardrailResult(
                is_safe=True,
                sanitized_content=sanitized_text,
                warnings=warnings,
                risk_score=0.0,
                provider=self.get_provider_name(),
                details={"scanners_available": False},
            )
        
        # Run each scanner
        for scanner in scanners:
            try:
                modified_text, is_valid, risk_score = scanner.scan("", sanitized_text)
                
                # Track max risk score
                if risk_score > max_risk_score:
                    max_risk_score = risk_score
                
                # Update sanitized text
                if modified_text != sanitized_text:
                    sanitized_text = modified_text
                    details[f"scanner_{scanner.__class__.__name__}_modified"] = True
                
                # Check if scanner blocked the content
                if not is_valid:
                    details[f"scanner_{scanner.__class__.__name__}_blocked"] = True
                    warnings.append(f"Blocked by {scanner.__class__.__name__} (risk: {risk_score:.2f})")
                
            except Exception as e:
                logger.warning(f"Error running scanner {scanner.__class__.__name__}: {e}")
                warnings.append(f"Scanner {scanner.__class__.__name__} error: {str(e)}")
        
        # Determine if content is safe
        is_safe = max_risk_score < self.threshold and all(
            not details.get(f"scanner_{scanner.__class__.__name__}_blocked", False)
            for scanner in scanners
        )
        
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
        Check output text using LLM Guard scanners.
        
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
        
        # Run LLM Guard scanners
        scanners = self._get_output_scanners()
        if not scanners:
            # No scanners available, return safe with warning
            warnings.append("LLM Guard scanners not available, using basic validation only")
            return GuardrailResult(
                is_safe=True,
                sanitized_content=filtered_response,
                warnings=warnings,
                risk_score=0.0,
                provider=self.get_provider_name(),
                details={"scanners_available": False},
            )
        
        # Run each scanner
        for scanner in scanners:
            try:
                modified_response, is_valid, risk_score = scanner.scan(prompt, filtered_response)
                
                # Track max risk score
                if risk_score > max_risk_score:
                    max_risk_score = risk_score
                
                # Update filtered response
                if modified_response != filtered_response:
                    filtered_response = modified_response
                    details[f"scanner_{scanner.__class__.__name__}_modified"] = True
                
                # Check if scanner blocked the content
                if not is_valid:
                    details[f"scanner_{scanner.__class__.__name__}_blocked"] = True
                    warnings.append(f"Blocked by {scanner.__class__.__name__} (risk: {risk_score:.2f})")
                
            except Exception as e:
                logger.warning(f"Error running scanner {scanner.__class__.__name__}: {e}")
                warnings.append(f"Scanner {scanner.__class__.__name__} error: {str(e)}")
        
        # Determine if content is safe
        is_safe = max_risk_score < self.threshold and all(
            not details.get(f"scanner_{scanner.__class__.__name__}_blocked", False)
            for scanner in scanners
        )
        
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
        return "llm-guard"
