
import os
import csv
import argparse
import numpy as np
import torch
import pandas as pd
from tqdm import tqdm
from PIL import Image

# Import necessary functions from inference.py
from inference import (
    load_model, 
    prepare_image, 
    extract_masked_region, 
    rgb_to_lab
)
from preprocessing import Preprocessor

def get_region_stats(img_arr, mask, label_indices):
    """
    Extract median L, a, b values from a specific masked region.
    Returns 0,0,0 if region is empty.
    """
    pixels = extract_masked_region(img_arr, mask, label_indices)
    if len(pixels) == 0:
        return 0.0, 0.0, 0.0 # L, a, b
    
    # rgb_to_lab returns Nx3 array
    lab = rgb_to_lab(pixels)
    
    L = lab[:, 0]
    a = lab[:, 1]
    b = lab[:, 2]
    
    # Return median values for robustness
    return float(np.median(L)), float(np.median(a)), float(np.median(b))

def map_italian_season(cls, sub_cls):
    """
    Maps Italian/English dataset labels to standard 12-Season System.
    """
    season_map = {
        "autunno": "AUTUMN",
        "inverno": "WINTER",
        "primavera": "SPRING",
        "estate": "SUMMER"
    }
    
    sub_map = {
        "deep": "DARK", # Deep -> Dark
        "light": "LIGHT",
        "cool": "COOL",
        "warm": "WARM",
        "soft": "MUTED", # Soft -> Muted
        "bright": "BRIGHT", # Clear -> Bright
        "clear": "BRIGHT"
    }
    
    # Fallback if already English
    s = season_map.get(cls.lower(), cls.upper())
    sub = sub_map.get(sub_cls.lower(), sub_cls.upper())
    
    # Construct "SUB SEASON" (e.g. DARK AUTUMN)
    # Standard format: [ADJECTIVE] [SEASON]
    return f"{sub} {s}"

def process_dataset(dataset_root, output_file, weights_path, backbone="resnet18"):
    # Detect device (Support CUDA, MPS, and CPU)
    if torch.backends.mps.is_available():
        device = torch.device("mps")
    elif torch.cuda.is_available():
        device = torch.device("cuda")
    else:
        device = torch.device("cpu")
        
    print(f"Using device: {device}")
    
    # Load Segmentation Model
    try:
        model = load_model(backbone, 19, weights_path, device)
        print("Model loaded successfully.")
    except Exception as e:
        print(f"Failed to load model: {e}")
        return

    data = []
    
    # Check for annotations.csv
    csv_path = os.path.join(dataset_root, "annotations.csv")
    xlsx_path = os.path.join(dataset_root, "annotations.xlsx")
    
    if os.path.exists(csv_path):
        print(f"Reading annotations from {csv_path}...")
        df = pd.read_csv(csv_path)
    elif os.path.exists(xlsx_path):
        print(f"Reading annotations from {xlsx_path}...")
        df = pd.read_excel(xlsx_path)
    else:
        print(f"Error: annotations.csv or annotations.xlsx not found in {dataset_root}")
        return
        
    # Initialize Preprocessor
    preprocessor = Preprocessor()
    
    print(f"Found {len(df)} images in annotations.")

    for _, row in tqdm(df.iterrows(), total=len(df)):
        try:
            # Parse Path
            # Example: MERGED_RGB_original/train/autunno/deep/10306.jpg
            # Actual: RGB/test/autunno/deep/10528.jpg
            # Logic: If path_rgb_original is full rel path, use it. If it starts with MERGED..., replace logic might be needed.
            # But based on list_dir, we have `RGB` directory.
            
            rel_path = row['path_rgb_original']
            
            # Fix: The dataset has 'MERGED_RGB_original' in path, but our folder is 'RGB'
            # We replace the prefix if necessary
            if rel_path.startswith("MERGED_RGB_original"):
                rel_path = rel_path.replace("MERGED_RGB_original", "RGB")
            
            full_path = os.path.join(dataset_root, rel_path)
            
            if not os.path.exists(full_path):
                # Try handling if path starts with slash or not
                # Sometimes datasets have weird paths
                continue
                
            # Parse Label
            cls = row['class']
            sub_cls = row['sub_class']
            label = map_italian_season(cls, sub_cls)
            
            # Load Image
            img = Image.open(full_path).convert("RGB")
            
            # --- Preprocessing ---
            img = preprocessor.process(img)
            original_size = img.size
            
            # --- Run Segmentation ---
            img_tensor = prepare_image(img).to(device)
            with torch.no_grad():
                out = model(img_tensor)[0]
            
            # Get mask
            mask_tensor = out.squeeze(0).cpu().numpy().argmax(0)
            mask_pil = Image.fromarray(mask_tensor.astype('uint8'))
            mask = np.array(mask_pil.resize(original_size, Image.NEAREST))
            
            img_arr = np.array(img)

            # --- Extract Raw Stats ---
            sk_L, sk_a, sk_b = get_region_stats(img_arr, mask, [1])
            hr_L, hr_a, hr_b = get_region_stats(img_arr, mask, [17])
            lp_L, lp_a, lp_b = get_region_stats(img_arr, mask, [12, 13])
            ey_L, ey_a, ey_b = get_region_stats(img_arr, mask, [4, 5])
            
            # Filter out images where skin detection failed
            if sk_L == 0 and sk_a == 0 and sk_b == 0:
                continue

            # Append to list
            data.append({
                "label": label,
                "filename": os.path.basename(full_path),
                "partition": row.get('partition', 'train'), # Keep partition info
                "sk_L": sk_L, "sk_a": sk_a, "sk_b": sk_b,
                "hr_L": hr_L, "hr_a": hr_a, "hr_b": hr_b,
                "lp_L": lp_L, "lp_a": lp_a, "lp_b": lp_b,
                "ey_L": ey_L, "ey_a": ey_a, "ey_b": ey_b,
            })
            
        except Exception as e:
            # print(f"Error processing {row.get('path_rgb_original', 'unknown')}: {e}")
            continue

    # Save to CSV
    if not data:
        print("No data extracted.")
        return
    
    keys = list(data[0].keys())
    with open(output_file, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=keys)
        writer.writeheader()
        writer.writerows(data)
    
    print(f"Successfully saved stats for {len(data)} images to {output_file}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Extract raw color stats for parameter tuning")
    parser.add_argument("--dataset", type=str, required=True, help="Path to dataset root folder (containing annotations.csv)")
    parser.add_argument("--output", type=str, default="dataset_stats.csv", help="Path to output CSV file")
    parser.add_argument("--weights", type=str, default="weights/resnet18.pt", help="Path to segmentation weights")
    
    args = parser.parse_args()
    
    process_dataset(args.dataset, args.output, args.weights)
