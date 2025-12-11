
import cv2
import numpy as np
import mediapipe as mp
from PIL import Image

class Preprocessor:
    def __init__(self):
        # Initialize MediaPipe Face Detection
        self.mp_face_detection = mp.solutions.face_detection
        self.face_detection = self.mp_face_detection.FaceDetection(model_selection=1, min_detection_confidence=0.5)

    def detect_and_crop_face(self, image: Image.Image, padding: float = 0.0):
        """
        Detects the largest face in the image and crops it.
        Returns the cropped PIL Image. If no face found, returns None.
        """
        # Convert PIL to CV2 (BGR)
        img_np = np.array(image)
        if img_np.shape[2] == 4: # RGBA to RGB
            img_np = cv2.cvtColor(img_np, cv2.COLOR_RGBA2RGB)
        
        # MediaPipe expects RGB
        results = self.face_detection.process(img_np)

        if not results.detections:
            return None

        # Find largest face
        w, h = image.size
        max_area = 0
        best_box = None

        for detection in results.detections:
            bboxC = detection.location_data.relative_bounding_box
            ih, iw, _ = img_np.shape
            x, y, w_box, h_box = int(bboxC.xmin * iw), int(bboxC.ymin * ih), int(bboxC.width * iw), int(bboxC.height * ih)
            
            area = w_box * h_box
            if area > max_area:
                max_area = area
                best_box = (x, y, w_box, h_box)

        if best_box:
            x, y, w_box, h_box = best_box
            
            # Add padding
            x_pad = int(w_box * padding)
            y_pad = int(h_box * padding)
            
            x1 = max(0, x - x_pad)
            y1 = max(0, y - y_pad)
            x2 = min(w, x + w_box + x_pad)
            y2 = min(h, y + h_box + y_pad)
            
            return image.crop((x1, y1, x2, y2))
            
        return None

    def white_balance(self, image: Image.Image) -> Image.Image:
        """
        Apply Gray World assumption white balancing.
        """
        img_np = np.array(image).astype(np.float32)
        
        # Calculate mean of each channel
        avg_r = np.mean(img_np[:, :, 0])
        avg_g = np.mean(img_np[:, :, 1])
        avg_b = np.mean(img_np[:, :, 2])
        
        # Calculate average gray value
        avg_gray = (avg_r + avg_g + avg_b) / 3.0
        
        # Scaling factors
        scale_r = avg_gray / (avg_r + 1e-6)
        scale_g = avg_gray / (avg_g + 1e-6)
        scale_b = avg_gray / (avg_b + 1e-6)
        
        # Apply scaling
        img_np[:, :, 0] *= scale_r
        img_np[:, :, 1] *= scale_g
        img_np[:, :, 2] *= scale_b
        
        # Clip values
        img_np = np.clip(img_np, 0, 255).astype(np.uint8)
        
        return Image.fromarray(img_np)

    def process(self, image: Image.Image) -> Image.Image:
        """
        Full pipeline: Detect/Crop -> White Balance
        """
        # 1. Detect and Crop
        # Padding 0.3 (30%) ensures we include hair and chin which are crucial for analysis
        cropped = self.detect_and_crop_face(image, padding=0.3)
        if cropped is None:
            # Fallback: use original image if face detection fails (maybe it's already cropped?)
            cropped = image
        
        # 2. White Balance
        balanced = self.white_balance(cropped)
        
        return balanced

