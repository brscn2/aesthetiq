
import os
import argparse
import logging
import json
from typing import List, Tuple, Optional, Dict
from pathlib import Path

import numpy as np
from PIL import Image
from tqdm import tqdm
import torch
import cv2
import torchvision.transforms as transforms
import matplotlib.pyplot as plt

from models.bisenet import BiSeNet
from utils.common import vis_parsing_maps

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s', datefmt='%Y-%m-%d %H:%M:%S')
logger = logging.getLogger(__name__)

DEFAULT_CONFIG = {
    # Weights for aggregating regions
    "weights": {
        "undertone": {"skin": 0.70, "lip": 0.15, "hair": 0.15},
        "depth":     {"skin": 0.65, "hair": 0.35},
        "chroma":    {"skin": 0.75, "lip": 0.15, "eye": 0.10},
        "contrast":  {"hair_skin": 0.80, "eye": 0.10, "lip": 0.10}
    },
    # Scaling factors for tanh normalization
    "scales": {
        "undertone": 2.25,
        "depth": 3.5,
        "chroma": 0.12,
        "contrast": 3.0
    },
    # Offsets (Biases)
    "offsets": {
        "undertone": 0.6,
        "depth": 0.1,
        "chroma": -23.0,
        "contrast": -0.62
    },
    # Season Archetype Vectors [Undertone, Depth, Chroma, Contrast]
    "seasons": {
        "COOL WINTER":   [-0.95, -0.5, +0.6, +0.85],
        "COOL SUMMER":   [-0.90, +0.4, -0.3, -0.2],
        "WARM SPRING":   [+0.90, +0.6, +0.7, +0.5],
        "WARM AUTUMN":   [+0.95, -0.4, +0.1, -0.1],
        "MUTED SUMMER":  [-0.65, +0.2, -0.55, -0.5], # SOFT SUMMER
        "MUTED AUTUMN":  [+0.65, -0.1, -0.45, -0.4], # SOFT AUTUMN
        "BRIGHT WINTER": [-0.75, -0.1, +0.85, +0.9],
        "BRIGHT SPRING": [+0.55, +0.4, +0.85, +0.75],
        "DARK AUTUMN":   [+0.75, -0.65, +0.25, +0.35], # DEEP AUTUMN
        "DARK WINTER":   [-0.70, -0.70, +0.55, +0.7],  # DEEP WINTER
        "LIGHT SPRING":  [+0.60, +0.75, +0.45, +0.4],
        "LIGHT SUMMER":  [-0.60, +0.80, -0.15, +0.1]
    }
}

class ColorAnalysisPipeline:
    def __init__(self, config_path: Optional[str] = None):
        self.config = DEFAULT_CONFIG
        if config_path and os.path.exists(config_path):
            try:
                with open(config_path, 'r') as f:
                    loaded_config = json.load(f)
                    # Basic validation could go here
                    self.config = loaded_config
                logger.info(f"Loaded tuned configuration from {config_path}")
            except Exception as e:
                logger.error(f"Failed to load config from {config_path}, using default. Error: {e}")
        else:
            logger.info("Using default heuristic configuration.")

    def get_season_vectors(self):
        return {k: np.array(v) for k, v in self.config['seasons'].items()}

    def extract_masked_region(self, img, mask, labels):
        region_mask = np.isin(mask, labels)
        return img[region_mask]

    def rgb_to_lab(self, pixels_rgb):
        if pixels_rgb.dtype != np.uint8:
            if pixels_rgb.max() <= 1.0:
                pixels_rgb = (pixels_rgb * 255).astype(np.uint8)
            else:
                pixels_rgb = pixels_rgb.astype(np.uint8)

        pixels_bgr = pixels_rgb[:, ::-1]
        lab = cv2.cvtColor(pixels_bgr.reshape(-1, 1, 3), cv2.COLOR_BGR2LAB).reshape(-1, 3).astype(np.float32)
        # OpenCV LAB: L[0-255], a[0-255], b[0-255]. Shift a/b to centered
        lab[:, 1] -= 128
        lab[:, 2] -= 128
        return lab

    def split_eye_pixels(self, eye_lab, sclera_ratio=0.10, iris_ratio=0.50):
        if len(eye_lab) < 20:
            return np.array([]), np.array([]), np.array([]), np.array([])

        L = eye_lab[:, 0]
        a = eye_lab[:, 1]
        b = eye_lab[:, 2]

        idx = np.argsort(L)
        n = len(idx)
        sclera_start = int(n * (1 - sclera_ratio))
        sclera_idx = idx[sclera_start:]
        sclera_L = L[sclera_idx]

        mid_start = int(n * max(0, 0.5 - iris_ratio / 2))
        mid_end = int(n * min(1, 0.5 + iris_ratio / 2))
        iris_idx = idx[mid_start:mid_end]

        iris_L = L[iris_idx]
        iris_a = a[iris_idx]
        iris_b = b[iris_idx]
        return sclera_L, iris_L, iris_a, iris_b

    def get_warmth(self, a_star, b_star, Chroma):
        W_PEAK = 70.0
        W_k = 30.0
        h_rad = np.arctan2(b_star, a_star)
        h_deg = np.degrees(h_rad)
        h_deg = np.where(h_deg < 0, h_deg + 360, h_deg)
        
        warmth = (1 - np.cos(np.radians(h_deg - W_PEAK)))
        warmth_weighted = warmth * (Chroma / (Chroma + W_k))
        return warmth_weighted - 1.0

    def extract_features(self, skin, hair, eye, lips):
        # Config Accessors
        w = self.config['weights']
        s = self.config['scales']
        o = self.config['offsets']

        # LAB Conversion
        Ls, As, Bs = self.rgb_to_lab(skin).T if len(skin) else (np.zeros(0),)*3
        Lh, Ah, Bh = self.rgb_to_lab(hair).T if len(hair) else (np.zeros(0),)*3
        Le, Ae, Be = self.rgb_to_lab(eye).T  if len(eye)  else (np.zeros(0),)*3
        Ll, Al, Bl = self.rgb_to_lab(lips).T if len(lips) else (np.zeros(0),)*3

        eye_lab = np.column_stack([Le, Ae, Be])
        sclera_L, iris_L, iris_a, iris_b = self.split_eye_pixels(eye_lab)

        def safe_med(v):
            return float(np.median(v)) if len(v) else 0.0

        # --- 1. CHROMA ---
        skin_chroma = np.sqrt(safe_med(As)**2 + safe_med(Bs)**2)
        lip_chroma = np.sqrt(safe_med(Al)**2 + safe_med(Bl)**2)
        iris_chroma = np.sqrt(safe_med(iris_a)**2 + safe_med(iris_b)**2)
        
        # Note: Weights in config are assumed to sum to 1.0 (or close to it)
        chroma_raw = (
            w['chroma']['skin'] * skin_chroma +
            w['chroma']['lip'] * lip_chroma +
            w['chroma']['eye'] * iris_chroma
        )
        chroma = np.tanh((chroma_raw + o['chroma']) * s['chroma'])

        # --- 2. DEPTH ---
        skin_L = safe_med(Ls)
        # Normalize L to -1..1 range first
        skin_depth_raw = (skin_L - 128.0) / 128.0 
        skin_depth_clipped = np.clip(skin_depth_raw, -1.0, 1.0)
        
        hair_L = safe_med(Lh)
        hair_depth_raw = (hair_L - 128.0) / 128.0
        hair_depth_clipped = np.clip(hair_depth_raw, -1.0, 1.0)
        
        depth_raw = (
            w['depth']['skin'] * skin_depth_clipped +
            w['depth']['hair'] * hair_depth_clipped
        )
        depth = np.tanh((depth_raw + o['depth']) * s['depth'])

        # --- 3. UNDERTONE ---
        skin_a, skin_b = safe_med(As), safe_med(Bs)
        skin_c_mag = np.sqrt(skin_a**2 + skin_b**2)
        
        lip_a, lip_b = safe_med(Al), safe_med(Bl)
        lip_c_mag = np.sqrt(lip_a**2 + lip_b**2)
        
        hair_a, hair_b = safe_med(Ah), safe_med(Bh)
        hair_c_mag = np.sqrt(hair_a**2 + hair_b**2)
        
        skin_w = self.get_warmth(skin_a, skin_b, skin_c_mag)
        lip_w = self.get_warmth(lip_a, lip_b, lip_c_mag)
        hair_w = self.get_warmth(hair_a, hair_b, hair_c_mag)
        
        undertone_raw = (
            w['undertone']['skin'] * skin_w +
            w['undertone']['lip'] * lip_w +
            w['undertone']['hair'] * hair_w
        )
        undertone = np.tanh((undertone_raw + o['undertone']) * s['undertone'])

        # --- 4. CONTRAST ---
        hair_skin_c = abs(safe_med(Lh) - safe_med(Ls)) / 128.0
        # Use iris vs sclera if available, else iris vs skin might be fallback, but here we keep simple
        # Note: inference.py used iris_L vs sclera_L.
        eye_c = abs(safe_med(iris_L) - safe_med(sclera_L)) / 128.0
        lip_skin_c = abs(safe_med(Ll) - safe_med(Ls)) / 128.0
        
        contrast_raw = (
            w['contrast']['hair_skin'] * hair_skin_c +
            w['contrast']['eye'] * eye_c +
            w['contrast']['lip'] * lip_skin_c
        )
        contrast = np.tanh((contrast_raw + o['contrast']) * s['contrast'])

        return np.array([undertone, depth, chroma, contrast])

    def assign_palette(self, features):
        seasons = self.get_season_vectors()
        
        f_norm = np.linalg.norm(features)
        if f_norm < 1e-6: f_norm = 1.0
        F = features / f_norm

        scores = {}
        for name, season_vec in seasons.items():
            s_norm = np.linalg.norm(season_vec)
            if s_norm < 1e-6: s_norm = 1.0
            S = season_vec / s_norm
            scores[name] = float(np.dot(F, S))

        best_season = max(scores, key=scores.get)
        return best_season, scores

# --- Standalone Functions for legacy compatibility if needed ---
def prepare_image(image: Image.Image, input_size: Tuple[int, int] = (512, 512)) -> torch.Tensor:
    resized_image = image.resize(input_size, resample=Image.BILINEAR)
    transform = transforms.Compose([
        transforms.ToTensor(),
        transforms.Normalize((0.485, 0.456, 0.406), (0.229, 0.224, 0.225)),
    ])
    image_tensor = transform(resized_image)
    return image_tensor.unsqueeze(0)

def load_model(model_name: str, num_classes: int, weight_path: str, device: torch.device) -> torch.nn.Module:
    model = BiSeNet(num_classes, backbone_name=model_name)
    model.to(device)
    if os.path.exists(weight_path):
        model.load_state_dict(torch.load(weight_path, map_location=device))
    else:
        raise ValueError(f"Weights not found from given path ({weight_path})")
    model.eval()
    return model

# Basic Helper exports
def extract_masked_region(img, mask, labels):
    pipeline = ColorAnalysisPipeline()
    return pipeline.extract_masked_region(img, mask, labels)

def rgb_to_lab(pixels):
    pipeline = ColorAnalysisPipeline()
    return pipeline.rgb_to_lab(pixels)

def extract_features_multiregion(skin, hair, eye, lips):
    # This uses DEFAULT config if called directly
    pipeline = ColorAnalysisPipeline()
    return pipeline.extract_features(skin, hair, eye, lips)

def assign_palette(features):
    # This uses DEFAULT config if called directly
    pipeline = ColorAnalysisPipeline()
    return pipeline.assign_palette(features)
