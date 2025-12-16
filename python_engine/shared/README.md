# Shared Utilities

This folder contains shared code that can be used across Aesthetiq microservices.

## Structure

```
shared/
├── __init__.py
├── auth.py           # Authentication & authorization utilities
└── README.md
```

## Modules

### auth.py

Authentication helpers for API key validation, JWT/Clerk integration, and RBAC.

```python
from shared.auth import verify_api_key, get_current_user, require_role
```

## Usage

Copy the files you need into your service's `app/` directory to keep services isolated.

## Notes

- **Logging**: Each service has its own logger in `app/core/logger.py` (could be shared in future)
- **Database**: Each service manages its own database connections (not shared)
