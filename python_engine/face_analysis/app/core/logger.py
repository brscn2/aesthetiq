"""Centralized logging configuration for Face Analysis."""
import logging
import sys
from typing import Any
import json
from datetime import datetime, timezone
from pathlib import Path

from app.core.config import get_settings


class JSONFormatter(logging.Formatter):
    """Custom JSON formatter for structured logging."""
    
    def format(self, record: logging.LogRecord) -> str:
        """Format log record as JSON."""
        log_data = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }
        
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
        
        if hasattr(record, "extra"):
            log_data["extra"] = record.extra
            
        return json.dumps(log_data)


class ConsoleFormatter(logging.Formatter):
    """Colored console formatter for development."""
    
    COLORS = {
        "DEBUG": "\033[36m",
        "INFO": "\033[32m",
        "WARNING": "\033[33m",
        "ERROR": "\033[31m",
        "CRITICAL": "\033[35m",
    }
    RESET = "\033[0m"
    
    def format(self, record: logging.LogRecord) -> str:
        """Format log record with colors."""
        color = self.COLORS.get(record.levelname, self.RESET)
        record.levelname = f"{color}{record.levelname}{self.RESET}"
        return super().format(record)


_configured_loggers = set()


def setup_logger(name: str = "app") -> logging.Logger:
    """Setup and configure application logger."""
    global _configured_loggers
    
    settings = get_settings()
    logger = logging.getLogger(name)
    
    if name != "app" or name in _configured_loggers:
        return logger
    
    _configured_loggers.add(name)
    
    logger.setLevel(getattr(logging, settings.LOG_LEVEL.upper()))
    logger.propagate = False
    
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.DEBUG)
    
    if settings.LOG_FORMAT == "json":
        formatter = JSONFormatter()
    else:
        formatter = ConsoleFormatter(
            fmt="%(asctime)s | %(levelname)s | %(name)s:%(funcName)s:%(lineno)d | %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S"
        )
    
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)
    
    if not settings.DEBUG:
        log_dir = Path("logs")
        log_dir.mkdir(exist_ok=True)
        
        file_handler = logging.FileHandler(log_dir / "app.log")
        file_handler.setLevel(logging.INFO)
        file_handler.setFormatter(JSONFormatter())
        logger.addHandler(file_handler)
    
    return logger


def get_logger(name: str = "app") -> logging.Logger:
    """Get or create a logger instance."""
    return setup_logger(name)


_root_logger = setup_logger("app")
