"""
Face Analysis Service - Color Season and Face Shape Detection

This service handles:
- Face detection and preprocessing
- Face shape classification
- Color season analysis using ResNet
- Skin tone and feature extraction
"""
import os
import torch
import numpy as np
import pickle
from PIL import Image
from transformers import pipeline
from typing import Dict, Any, Union

from app.core.logger import get_logger
from preprocessing import Preprocessor

logger = get_logger(__name__)


class FaceAnalysisService:
    """
    Service for analyzing facial features and determining color season.
    
    Features:
        - Face detection and preprocessing
        - White balance correction
        - Face shape classification
        - Color season prediction using ResNet
        - Test-time augmentation for improved accuracy
    """
    
    def __init__(
        self, 
        segmentation_weights: str = "weights/resnet18.pt", 
        segmentation_backbone: str = "resnet18", 
        tuned_parameters: str = "tuned_parameters.json",
        model_path: str = "weights/season_resnet18.pth",
        device: str = "cuda"
    ):
        """
        Initialize the Face Analysis Service.
        
        Args:
            segmentation_weights: Path to segmentation model weights
            segmentation_backbone: Backbone architecture for segmentation
            tuned_parameters: Path to tuned parameters JSON
            model_path: Path to ResNet season classification model
            device: Device to run models on (cuda/cpu/mps)
        """
        # Enable MPS (Metal Performance Shaders) for Apple Silicon
        if torch.backends.mps.is_available():
            self.device = torch.device("mps")
        else:
            self.device = torch.device(device if torch.cuda.is_available() else "cpu")
            
        logger.info(f"Initializing FaceAnalysisService on {self.device}")

        # 0. Initialize Preprocessor
        self.preprocessor = Preprocessor()

        # 1. Load ResNet Model (Deep Learning Season Classification)
        self.model_path = model_path
        
        # Try to load LabelEncoder from the same directory as the model
        model_dir = os.path.dirname(self.model_path)
        le_path = os.path.join(model_dir if model_dir else ".", "season_label_encoder.pkl")
        logger.debug(f"LabelEncoder path: '{le_path}'")
        
        # Default fallback (CRITICAL: Must match training if pickle fails)
        self.season_classes = sorted([
            "DARK AUTUMN", "DARK WINTER", "LIGHT SPRING", "LIGHT SUMMER",
            "MUTED AUTUMN", "MUTED SUMMER", "BRIGHT SPRING", "BRIGHT WINTER",
            "WARM AUTUMN", "WARM SPRING", "COOL WINTER", "COOL SUMMER"
        ])

        # Load season_classes from saved pickle file
        if os.path.exists(le_path):
            try:
                with open(le_path, 'rb') as f:
                    self.le = pickle.load(f)
                self.season_classes = self.le.classes_.tolist()
                logger.info(f"Loaded LabelEncoder from {le_path}")
                logger.debug(f"Classes: {self.season_classes}")
            except Exception as e:
                logger.error(f"Failed to load LabelEncoder from {le_path}: {e}")
        else:
            logger.warning(f"LabelEncoder not found at {le_path}. Using hardcoded sorted classes.")
        
        # Load ResNet model
        try:
            from torchvision import models
            
            self.resnet = models.resnet18(weights=None)  # Weights loaded from file
            num_ftrs = self.resnet.fc.in_features
            self.resnet.fc = torch.nn.Linear(num_ftrs, len(self.season_classes))
            
            if os.path.exists(self.model_path):
                self.resnet.load_state_dict(
                    torch.load(self.model_path, map_location=self.device, weights_only=True)
                )
                logger.info(f"Loaded ResNet season model from {self.model_path}")
            else:
                logger.warning(f"Model file {self.model_path} not found. Running in dummy mode.")
                
            self.resnet.to(self.device)
            self.resnet.eval()
            
            # Transform for inference (ImageNet normalization)
            from torchvision import transforms
            self.transform = transforms.Compose([
                transforms.Resize((224, 224)),
                transforms.ToTensor(),
                transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
            ])
            
        except Exception as e:
            logger.error(f"Failed to load ResNet model: {e}", exc_info=True)
            self.resnet = None
            
        # 2. Load Face Shape Classification Model
        try:
            # Pass the torch.device object directly to support CPU, CUDA, and MPS
            self.face_shape_classifier = pipeline(
                "image-classification", 
                model="metadome/face_shape_classification", 
                device=self.device
            )
            logger.info("Face shape classification model loaded successfully.")
        except Exception as e:
            logger.error(f"Failed to load face shape model: {e}", exc_info=True)
            self.face_shape_classifier = None
    
    def process_image(self, image_input: Union[str, Image.Image]) -> Dict[str, Any]:
        """
        Process a single image to extract face shape and color palette.
        
        Args:
            image_input: Path to image file or PIL Image object
            
        Returns:
            Dictionary containing:
                - face_shape: Detected face shape
                - face_shape_score: Confidence score for face shape
                - palette: Detected color season/palette
                - palette_scores: Confidence scores for all seasons
                - features: Extracted facial features (currently empty)
                
        Raises:
            FileNotFoundError: If image path doesn't exist
            ValueError: If input type is invalid
        """
        try:
            # Handle input type
            if isinstance(image_input, str):
                if not os.path.exists(image_input):
                    raise FileNotFoundError(f"Image file not found: {image_input}")
                image = Image.open(image_input).convert("RGB")
            elif isinstance(image_input, Image.Image):
                image = image_input.convert("RGB")
            else:
                raise ValueError("Input must be a file path or PIL Image object")

            logger.info("Starting image processing")
            
            # --- Preprocessing (Face Detect + White Balance) ---
            image = self.preprocessor.process(image)
            original_size = image.size

            # --- A. Face Shape Classification ---
            face_shape_result = self._classify_face_shape(image)
            
            result = {
                "face_shape": face_shape_result["label"],
                "face_shape_score": face_shape_result["score"]
            }

            # --- B. Color Palette Analysis (Deep Learning) ---
            palette_result = self._classify_color_season(image)
            
            result['palette'] = palette_result["palette"]
            result['palette_scores'] = palette_result["scores"]
            result['features'] = []  # Placeholder for future feature extraction
            
            logger.info(
                f"Processing complete: face_shape={result['face_shape']}, "
                f"palette={result['palette']}"
            )
            
            return result

        except Exception as e:
            logger.error(f"Error processing image: {e}", exc_info=True)
            return {"error": str(e)}
    
    def _classify_face_shape(self, image: Image.Image) -> Dict[str, Any]:
        """
        Classify face shape using HuggingFace model.
        
        Args:
            image: PIL Image object
            
        Returns:
            Dictionary with label and score
        """
        if not self.face_shape_classifier:
            logger.warning("Face shape classifier not available")
            return {"label": "Unknown", "score": 0.0}
        
        try:
            face_shape_preds = self.face_shape_classifier(image)
            top_face_shape = max(face_shape_preds, key=lambda x: x['score'])
            
            logger.debug(f"Face shape: {top_face_shape['label']} ({top_face_shape['score']:.3f})")
            
            return {
                "label": top_face_shape['label'],
                "score": float(top_face_shape['score'])
            }
        except Exception as e:
            logger.error(f"Error in face shape classification: {e}")
            return {"label": "Unknown", "score": 0.0}
    
    def _classify_color_season(self, image: Image.Image) -> Dict[str, Any]:
        """
        Classify color season using ResNet model with test-time augmentation.
        
        Args:
            image: PIL Image object
            
        Returns:
            Dictionary with palette name and scores for all seasons
        """
        palette_name = "Unknown"
        scores = {}
        
        if not self.resnet:
            logger.warning("ResNet model not available")
            return {"palette": palette_name, "scores": scores}
        
        try:
            # Test Time Augmentation (TTA): Predict on Original + Flipped image
            # 1. Original
            t_original = self.transform(image)
            
            # 2. Horizontal Flip
            img_flipped = image.transpose(Image.FLIP_LEFT_RIGHT)
            t_flipped = self.transform(img_flipped)
            
            # Stack batch: [2, 3, 224, 224]
            input_batch = torch.stack([t_original, t_flipped]).to(self.device)

            with torch.no_grad():
                outputs = self.resnet(input_batch)
                probs_batch = torch.softmax(outputs, dim=1)
                
                # Average probabilities across the batch (TTA)
                avg_probs = torch.mean(probs_batch, dim=0)
                
                # Get Top Prediction
                top_idx = torch.argmax(avg_probs).item()
                palette_name = self.season_classes[top_idx]
                
                # Get all scores
                for i, season in enumerate(self.season_classes):
                    scores[season] = float(avg_probs[i])
            
            logger.debug(f"Color season: {palette_name} ({scores[palette_name]:.3f})")
            
            return {
                "palette": palette_name.title(),
                "scores": scores
            }
            
        except Exception as e:
            logger.error(f"Error in color season classification: {e}")
            return {"palette": "Unknown", "scores": {}}
    
    async def process_image_async(self, image_input: Union[str, Image.Image]) -> Dict[str, Any]:
        """
        Async version of process_image for use in async contexts.
        
        Args:
            image_input: Path to image file or PIL Image object
            
        Returns:
            Processing results dictionary
            
        Note:
            Runs synchronous PyTorch inference in a thread pool to avoid
            blocking the async event loop. PyTorch doesn't natively support
            async inference, so this is the recommended approach.
        """
        import asyncio
        return await asyncio.to_thread(self.process_image, image_input)


if __name__ == "__main__":
    # Example usage
    import sys
    
    if len(sys.argv) > 1:
        img_path = sys.argv[1]
        service = FaceAnalysisService()
        res = service.process_image(img_path)
        print(res)
    else:
        print("Usage: python face_analysis_service.py <image_path>")
