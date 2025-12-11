
import logging
import os
import torch
import numpy as np
from PIL import Image
from transformers import pipeline
from typing import Dict, Any, Union

# Import core logic from inference.py
from inference import (
    load_model,
    prepare_image,
    ColorAnalysisPipeline
)
from preprocessing import Preprocessor

# Set up logging
logger = logging.getLogger(__name__)

class FaceAnalysisService:
    def __init__(self, 
                 segmentation_weights: str = "weights/resnet18.pt", 
                 segmentation_backbone: str = "resnet18", 
                 tuned_parameters: str = "tuned_parameters.json",
                 model_path: str = "season_resnet18.pth",
                 device: str = "cuda"):
        """
        Initialize the Face Analysis Service.
        """
        # Enable MPS (Metal Performance Shaders) for Apple Silicon
        if torch.backends.mps.is_available():
            self.device = torch.device("mps")
        else:
            self.device = torch.device(device if torch.cuda.is_available() else "cpu")
            
        logger.info(f"Initializing FaceAnalysisService on {self.device}")

        # 0. Initialize Preprocessor
        self.preprocessor = Preprocessor()

        # 1. Initialize Color Analysis Pipeline (Loads tuned parameters if available)
        self.color_pipeline = ColorAnalysisPipeline(config_path=tuned_parameters)

        # 2. Load ResNet Model (New Deep Learning Approach)
        self.model_path = model_path
        self.season_classes = [
            "DARK AUTUMN", "DARK WINTER", "LIGHT SPRING", "LIGHT SUMMER",
            "MUTED AUTUMN", "MUTED SUMMER", "BRIGHT SPRING", "BRIGHT WINTER",
            "WARM AUTUMN", "WARM SPRING", "COOL WINTER", "COOL SUMMER"
        ]
        
        try:
            from torchvision import models
            self.resnet = models.resnet18(weights=None) # Weights loaded from file
            num_ftrs = self.resnet.fc.in_features
            self.resnet.fc = torch.nn.Linear(num_ftrs, len(self.season_classes))
            
            if os.path.exists(self.model_path):
                self.resnet.load_state_dict(torch.load(self.model_path, map_location=self.device))
                logger.info(f"Loaded Deep Learning Season Model from {self.model_path}")
            else:
                logger.warning(f"Model file {self.model_path} not found. Running in dummy mode for seasons.")
                
            self.resnet.to(self.device)
            self.resnet.eval()
            
            # Transform for inference
            from torchvision import transforms
            self.transform = transforms.Compose([
                transforms.Resize((224, 224)),
                transforms.ToTensor(),
                transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
            ])
            
        except Exception as e:
             logger.error(f"Failed to load ResNet model: {e}")
             self.resnet = None

        # 2. Load Segmentation Model (Still used for explainability features)
        self.seg_num_classes = 19
        if not os.path.exists(segmentation_weights):
             raise FileNotFoundError(f"Segmentation weights not found at {segmentation_weights}")

        try:
            self.seg_model = load_model(segmentation_backbone, self.seg_num_classes, segmentation_weights, self.device)
            logger.info("Segmentation model loaded successfully.")
        except Exception as e:
            logger.error(f"Failed to load segmentation model: {e}")
            raise

        # 3. Load Face Shape Classification Model
        try:
            # Using -1 for CPU, 0+ for GPU
            hf_device = 0 if self.device.type == 'cuda' else -1
            self.face_shape_classifier = pipeline(
                "image-classification", 
                model="metadome/face_shape_classification", 
                device=hf_device
            )
            logger.info("Face shape classification model loaded successfully.")
        except Exception as e:
            logger.error(f"Failed to load face shape model: {e}")
            raise
    
    def process_image(self, image_input: Union[str, Image.Image]) -> Dict[str, Any]:
        """
        Process a single image to extract face shape and color palette.
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

            # --- Preprocessing (Face Detect + White Balance) ---
            image = self.preprocessor.process(image)
            original_size = image.size

            # --- A. Face Shape Classification ---
            face_shape_preds = self.face_shape_classifier(image)
            top_face_shape = max(face_shape_preds, key=lambda x: x['score'])
            
            result = {
                "face_shape": top_face_shape['label'],
                "face_shape_score": top_face_shape['score']
            }

            # --- B. Segmentation ---
            image_batch = prepare_image(image).to(self.device)
            with torch.no_grad():
                output = self.seg_model(image_batch)[0]
            
            predicted_mask = output.squeeze(0).cpu().numpy().argmax(0)
            
            # Resize mask to original resolution
            mask_pil = Image.fromarray(predicted_mask.astype(np.uint8))
            restored_mask = mask_pil.resize(original_size, resample=Image.NEAREST)
            mask = np.array(restored_mask)

            # --- C. Color Palette Analysis (Deep Learning) ---
            # 1. ResNet Prediction (The "Brain")
            palette_name = "Unknown"
            scores = {}
            
            if self.resnet:
                input_tensor = self.transform(image).unsqueeze(0).to(self.device)
                with torch.no_grad():
                    outputs = self.resnet(input_tensor)
                    probs = torch.softmax(outputs, dim=1)[0]
                    
                    # Get Top Prediction
                    top_idx = torch.argmax(probs).item()
                    palette_name = self.season_classes[top_idx]
                    
                    # Get all scores
                    for i, season in enumerate(self.season_classes):
                        scores[season] = float(probs[i])
            
            # --- Result Construction ---
            result['palette'] = palette_name.title()
            result['palette_scores'] = scores
            # result['features'] = features.tolist() # Disabled feature extraction
            result['features'] = [] 
            
            return result

        except Exception as e:
            logger.error(f"Error processing image: {e}")
            return {"error": str(e)}

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
