"""
DEPRECATED: This file is maintained for backward compatibility only.

The FaceAnalysisService has been moved to:
    app/services/ml/face_analysis_service.py

Please update your imports to use the new location:
    from app.services.ml.face_analysis_service import FaceAnalysisService

This file will be removed in a future version.
"""
import warnings

# Import from new location for backward compatibility
from app.services.ml.face_analysis_service import FaceAnalysisService

# Emit deprecation warning
warnings.warn(
    "Importing FaceAnalysisService from app.service is deprecated. "
    "Use 'from app.services.ml.face_analysis_service import FaceAnalysisService' instead.",
    DeprecationWarning,
    stacklevel=2
)

__all__ = ["FaceAnalysisService"]
