import os
import requests
import pandas as pd
from tqdm import tqdm
from sklearn.metrics import classification_report, accuracy_score
import json

# Configuration
TEST_DIR = "backend/src/analysis/python_engine/data" # Root where annotations.xlsx is
API_URL = "http://127.0.0.1:8000/analyze"
OUTPUT_FILE = "backend/src/analysis/python_engine/evaluation_results.csv"

# Season Mapping (Italian folder names -> English class names)
SEASON_MAPPING = {
    "autunno": "AUTUMN",
    "inverno": "WINTER",
    "primevera": "SPRING",
    "primavera": "SPRING", # Handle typo
    "estate": "SUMMER"
}

SUB_SEASON_MAPPING = {
    "deep": "DARK",
    "cool": "COOL",
    "warm": "WARM",
    "light": "LIGHT",
    "clear": "BRIGHT",
    "soft": "MUTED"
}

def map_label(cls, sub_cls):
    s = SEASON_MAPPING.get(cls.lower(), cls.upper())
    sub = SUB_SEASON_MAPPING.get(sub_cls.lower(), sub_cls.upper())
    return f"{sub} {s}"

def evaluate():
    results = []
    
    # Load Annotations
    xlsx_path = os.path.join(TEST_DIR, "annotations.xlsx")
    if not os.path.exists(xlsx_path):
        print(f"Error: {xlsx_path} not found.")
        return
        
    df = pd.read_excel(xlsx_path)
    
    # Filter for 'test' partition if available, or just use all if you want to verify pipeline
    if 'partition' in df.columns:
        test_df = df[df['partition'] == 'test']
        if len(test_df) == 0:
             print("Warning: No 'test' partition found in xlsx. Using entire dataset for verification.")
             test_df = df
    else:
        test_df = df
        
    print(f"Found {len(test_df)} test images in annotations.")
    
    for _, row in tqdm(test_df.iterrows(), total=len(test_df)):
        try:
            rel_path = row['path_rgb_original']
            if rel_path.startswith("MERGED_RGB_original"):
                rel_path = rel_path.replace("MERGED_RGB_original", "RGB")
            
            img_path = os.path.join(TEST_DIR, rel_path)
            
            if not os.path.exists(img_path):
                # print(f"File not found: {img_path}")
                continue

            true_label = map_label(row['class'], row['sub_class'])
            
            # Call API
            with open(img_path, 'rb') as f:
                response = requests.post(API_URL, files={'file': f})
            
            if response.status_code == 200:
                data = response.json()
                pred_label = data['palette'].upper()
                scores = data['palette_scores']
                
                # Get Top 3 Predictions
                sorted_scores = sorted(scores.items(), key=lambda x: x[1], reverse=True)
                top1 = sorted_scores[0][0]
                top2 = sorted_scores[1][0] if len(sorted_scores) > 1 else None
                top3 = sorted_scores[2][0] if len(sorted_scores) > 2 else None
                
                is_top1 = (true_label == top1)
                is_top2 = (true_label == top1 or true_label == top2)
                is_top3 = (true_label == top1 or true_label == top2 or true_label == top3)
                
                results.append({
                    "image": os.path.basename(img_path),
                    "true_label": true_label,
                    "pred_label": pred_label,
                    "is_correct_top1": is_top1,
                    "is_correct_top2": is_top2,
                    "is_correct_top3": is_top3,
                    "top1_conf": sorted_scores[0][1],
                    "top2_conf": sorted_scores[1][1] if top2 else 0,
                    "top3_conf": sorted_scores[2][1] if top3 else 0,
                    "top1_pred": top1,
                    "top2_pred": top2,
                    "top3_pred": top3
                })
            else:
                print(f"Error processing {img_path}: {response.text}")
                
        except Exception as e:
            print(f"Failed {img_path}: {e}")

    # Analysis
    df_results = pd.DataFrame(results)
    
    if df_results.empty:
        print("No results collected.")
        return

    df_results.to_csv(OUTPUT_FILE, index=False)
    print(f"\nResults saved to {OUTPUT_FILE}")
    
    # Calculate Metrics
    acc_top1 = df_results['is_correct_top1'].mean()
    acc_top2 = df_results['is_correct_top2'].mean()
    acc_top3 = df_results['is_correct_top3'].mean()
    
    print("\n" + "="*40)
    print("EVALUATION REPORT")
    print("="*40)
    print(f"Total Images: {len(df_results)}")
    print(f"Top-1 Accuracy: {acc_top1:.2%}")
    print(f"Top-2 Accuracy: {acc_top2:.2%}")
    print(f"Top-3 Accuracy: {acc_top3:.2%}")
    print("="*40)
    
    print("\nDetailed Classification Report (Top-1):")
    print(classification_report(df_results['true_label'], df_results['pred_label']))

if __name__ == "__main__":
    evaluate()

