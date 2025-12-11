
import torch
import torch.nn as nn
import torch.optim as optim
import pandas as pd
import numpy as np
import argparse
import os
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score

class LearnableColorAnalysis(nn.Module):
    def __init__(self):
        super().__init__()
        self.w_undertone = nn.Parameter(torch.tensor([0.70, 0.15, 0.15])) 
        self.w_depth     = nn.Parameter(torch.tensor([0.65, 0.35]))       
        self.w_chroma    = nn.Parameter(torch.tensor([0.75, 0.15, 0.10])) 
        self.w_contrast  = nn.Parameter(torch.tensor([0.80, 0.10, 0.10])) 
        self.temperature = nn.Parameter(torch.tensor(5.0)) # Learnable temperature
        
        self.scales = nn.Parameter(torch.tensor([
            2.25,  # Undertone
            3.5,   # Depth
            0.12,  # Chroma
            3.0    # Contrast
        ]))
        
        self.offsets = nn.Parameter(torch.tensor([
            0.6,   # Undertone
            0.1,   # Depth
            -23.0, # Chroma Baseline (Note: inside tanh logic)
            -0.62  # Contrast
        ]))
        
        initial_seasons = torch.tensor([
             [+0.75, -0.65, +0.25, +0.35], # DARK AUTUMN (Deep Autumn)
             [-0.70, -0.70, +0.55, +0.70], # DARK WINTER (Deep Winter)
             [+0.60, +0.75, +0.45, +0.40], # LIGHT SPRING
             [-0.60, +0.80, -0.15, +0.10], # LIGHT SUMMER
             [+0.65, -0.10, -0.45, -0.40], # MUTED AUTUMN (Soft Autumn)
             [-0.65, +0.20, -0.55, -0.50], # MUTED SUMMER (Soft Summer)
             [+0.55, +0.40, +0.85, +0.75], # BRIGHT SPRING
             [-0.75, -0.10, +0.85, +0.90], # BRIGHT WINTER
             [+0.95, -0.40, +0.10, -0.10], # WARM AUTUMN
             [+0.90, +0.60, +0.70, +0.50], # WARM SPRING
             [-0.95, -0.50, +0.60, +0.85], # COOL WINTER
             [-0.90, +0.40, -0.30, -0.20], # COOL SUMMER
        ], dtype=torch.float32)
        
        self.season_vectors = nn.Parameter(initial_seasons)

    def get_warmth_tensor(self, a, b, chroma):
        W_PEAK = 70.0
        W_k = 30.0
        
        h_rad = torch.atan2(b, a)
        h_deg = torch.rad2deg(h_rad)
        h_deg = torch.where(h_deg < 0, h_deg + 360, h_deg)
        
        warmth = (1 - torch.cos(torch.deg2rad(h_deg - W_PEAK)))
        
        warmth_weighted = warmth * (chroma / (chroma + W_k + 1e-6))
        
        return warmth_weighted - 1.0

    def forward(self, x):
        sk_L, sk_a, sk_b = x[:, 0], x[:, 1], x[:, 2]
        hr_L, hr_a, hr_b = x[:, 3], x[:, 4], x[:, 5]
        lp_L, lp_a, lp_b = x[:, 6], x[:, 7], x[:, 8]
        ey_L, ey_a, ey_b = x[:, 9], x[:, 10], x[:, 11]
        
        sk_c = torch.sqrt(sk_a**2 + sk_b**2)
        hr_c = torch.sqrt(hr_a**2 + hr_b**2)
        lp_c = torch.sqrt(lp_a**2 + lp_b**2)
        ey_c = torch.sqrt(ey_a**2 + ey_b**2)
        
        sk_w = self.get_warmth_tensor(sk_a, sk_b, sk_c)
        lp_w = self.get_warmth_tensor(lp_a, lp_b, lp_c)
        hr_w = self.get_warmth_tensor(hr_a, hr_b, hr_c)
        
        w_und = torch.softmax(self.w_undertone, dim=0)
        undertone_raw = w_und[0]*sk_w + w_und[1]*lp_w + w_und[2]*hr_w
        
        undertone = torch.tanh((undertone_raw + self.offsets[0]) * self.scales[0])

        sk_depth_norm = (sk_L - 128.0)/128.0
        hr_depth_norm = (hr_L - 128.0)/128.0
        
        sk_depth_clipped = torch.clamp(sk_depth_norm, -1.0, 1.0)
        hr_depth_clipped = torch.clamp(hr_depth_norm, -1.0, 1.0)
        
        w_d = torch.softmax(self.w_depth, dim=0)
        depth_raw = w_d[0]*sk_depth_clipped + w_d[1]*hr_depth_clipped
        
        depth = torch.tanh((depth_raw + self.offsets[1]) * self.scales[1])
        
        w_c = torch.softmax(self.w_chroma, dim=0)
        chroma_raw = w_c[0]*sk_c + w_c[1]*lp_c + w_c[2]*ey_c
        
        chroma = torch.tanh((chroma_raw + self.offsets[2]) * self.scales[2])

        c_hs = torch.abs(hr_L - sk_L)/128.0
        c_eye = torch.abs(ey_L - sk_L)/128.0 
        c_lip = torch.abs(lp_L - sk_L)/128.0
        
        w_con = torch.softmax(self.w_contrast, dim=0)
        con_raw = w_con[0]*c_hs + w_con[1]*c_eye + w_con[2]*c_lip
        
        contrast = torch.tanh((con_raw + self.offsets[3]) * self.scales[3])
        
        features = torch.stack([undertone, depth, chroma, contrast], dim=1) # [Batch, 4]
        
        f_norm = torch.nn.functional.normalize(features, p=2, dim=1)
        s_norm = torch.nn.functional.normalize(self.season_vectors, p=2, dim=1)
        
        similarity_scores = torch.mm(f_norm, s_norm.T)
        
        return similarity_scores, features

def train(csv_path, epochs=1000, lr=0.01, test_size=0.2, random_state=42):
    try:
        df = pd.read_csv(csv_path)
    except FileNotFoundError:
        print(f"Error: CSV file '{csv_path}' not found.")
        return

    print(f"Loaded {len(df)} samples from {csv_path}.")

    name_map = {
        "deep_autumn": "DARK AUTUMN", "deep_winter": "DARK WINTER",
        "soft_autumn": "MUTED AUTUMN", "soft_summer": "MUTED SUMMER",
        "warm_autumn": "WARM AUTUMN", "warm_spring": "WARM SPRING",
        "cool_winter": "COOL WINTER", "cool_summer": "COOL SUMMER",
        "light_spring": "LIGHT SPRING", "light_summer": "LIGHT SUMMER",
        "bright_spring": "BRIGHT SPRING", "bright_winter": "BRIGHT WINTER"
    }
    
    df['label'] = df['label'].apply(lambda x: name_map.get(x.lower().replace(" ", "_"), x.upper().replace("_", " ")))
    
    season_order = [
        "DARK AUTUMN", "DARK WINTER", 
        "LIGHT SPRING", "LIGHT SUMMER",
        "MUTED AUTUMN", "MUTED SUMMER", 
        "BRIGHT SPRING", "BRIGHT WINTER",
        "WARM AUTUMN", "WARM SPRING", 
        "COOL WINTER", "COOL SUMMER"
    ]
    
    df = df[df['label'].isin(season_order)]
    if len(df) == 0:
        print("Error: No valid labels found after filtering. Check your dataset folder names.")
        print(f"Expected one of: {season_order}")
        return

    le = LabelEncoder()
    le.fit(season_order) # Force specific order
    y_all = le.transform(df['label'].values)
    
    # Input Features
    X_cols = ['sk_L', 'sk_a', 'sk_b', 'hr_L', 'hr_a', 'hr_b', 
              'lp_L', 'lp_a', 'lp_b', 'ey_L', 'ey_a', 'ey_b']
    X_all = df[X_cols].values.astype(np.float32)

    # Train/Test Split
    X_train_np, X_test_np, y_train_np, y_test_np = train_test_split(
        X_all, y_all, test_size=test_size, random_state=random_state, stratify=y_all
    )

    # Convert to Tensors
    X_train = torch.tensor(X_train_np)
    y_train = torch.tensor(y_train_np, dtype=torch.long)
    X_test = torch.tensor(X_test_np)
    y_test = torch.tensor(y_test_np, dtype=torch.long)

    print(f"Training Set: {len(X_train)} samples")
    print(f"Test Set:     {len(X_test)} samples")
    
    # Initialize Model
    model = LearnableColorAnalysis()
    optimizer = optim.Adam(model.parameters(), lr=lr)
    # Note: verbose=True is deprecated in newer PyTorch versions for ReduceLROnPlateau, removed it to be safe
    scheduler = optim.lr_scheduler.ReduceLROnPlateau(optimizer, 'min', patience=100, factor=0.5)
    
    # Class weights for imbalance
    class_counts = np.bincount(y_train_np)
    class_weights = 1.0 / class_counts
    class_weights = torch.tensor(class_weights, dtype=torch.float32)
    class_weights = class_weights / class_weights.sum() * len(class_counts) # Normalize
    
    criterion = nn.CrossEntropyLoss(weight=class_weights)
    
    print("\nStarting Training (Differentiable Programming)...")
    
    for epoch in range(epochs):
        model.train() # Set to training mode
        optimizer.zero_grad()
        
        scores, features = model(X_train)
        
        loss = criterion(scores * model.temperature, y_train) 
        
        loss.backward()
        optimizer.step()
        
        # Step scheduler
        scheduler.step(loss)
        
        if epoch % 100 == 0 or epoch == epochs - 1:
            model.eval() # Set to eval mode
            with torch.no_grad():
                train_preds = scores.argmax(dim=1)
                train_acc = (train_preds == y_train).float().mean()
                
                test_scores, _ = model(X_test)
                test_preds = test_scores.argmax(dim=1)
                test_acc = (test_preds == y_test).float().mean()
                
            print(f"Epoch {epoch:4d}: Loss {loss.item():.4f} | Temp {model.temperature.item():.2f} | Train Acc {train_acc.item():.2%} | Test Acc {test_acc.item():.2%}")
            
    print("\n" + "="*40)
    print("       FINAL EVALUATION (TEST SET)")
    print("="*40)
    
    model.eval()
    with torch.no_grad():
        test_scores, _ = model(X_test)
        test_preds = test_scores.argmax(dim=1).numpy()
        
    print(classification_report(
        le.inverse_transform(y_test.numpy()), 
        le.inverse_transform(test_preds),
        zero_division=0
    ))
    
    print("\n" + "="*40)
    print("       OPTIMIZED PARAMETERS")
    print("="*40)
    
    np.set_printoptions(precision=4, suppress=True)

    tuned_config = {
        "weights": {
            "undertone": {
                "skin": float(torch.softmax(model.w_undertone, 0)[0]),
                "lip":  float(torch.softmax(model.w_undertone, 0)[1]),
                "hair": float(torch.softmax(model.w_undertone, 0)[2])
            },
            "depth": {
                "skin": float(torch.softmax(model.w_depth, 0)[0]),
                "hair": float(torch.softmax(model.w_depth, 0)[1])
            },
            "chroma": {
                "skin": float(torch.softmax(model.w_chroma, 0)[0]),
                "lip":  float(torch.softmax(model.w_chroma, 0)[1]),
                "eye":  float(torch.softmax(model.w_chroma, 0)[2])
            },
            "contrast": {
                "hair_skin": float(torch.softmax(model.w_contrast, 0)[0]),
                "eye":       float(torch.softmax(model.w_contrast, 0)[1]),
                "lip":       float(torch.softmax(model.w_contrast, 0)[2])
            }
        },
        "scales": {
            "undertone": float(model.scales[0]),
            "depth":     float(model.scales[1]),
            "chroma":    float(model.scales[2]),
            "contrast":  float(model.scales[3])
        },
        "offsets": {
            "undertone": float(model.offsets[0]),
            "depth":     float(model.offsets[1]),
            "chroma":    float(model.offsets[2]),
            "contrast":  float(model.offsets[3])
        },
        "seasons": {}
    }

    # Extract learned season vectors
    # Using detach() to ensure no gradient tracking
    final_seasons = model.season_vectors.detach().numpy()
    for i, name in enumerate(season_order):
        tuned_config["seasons"][name] = final_seasons[i].tolist()

    # Save to JSON
    import json
    
    # Determine output path relative to script location or absolute path
    script_dir = os.path.dirname(os.path.abspath(__file__))
    output_json = os.path.join(script_dir, "tuned_parameters.json")
    
    with open(output_json, 'w') as f:
        json.dump(tuned_config, f, indent=4)
    
    print(f"Tuned parameters saved to {output_json}")
    print("You can now load this file in FaceAnalysisService.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--csv", type=str, default="dataset_stats.csv", help="Path to extracted stats CSV")
    parser.add_argument("--epochs", type=int, default=1500)
    parser.add_argument("--lr", type=float, default=0.01)
    parser.add_argument("--test_size", type=float, default=0.2, help="Proportion of dataset to include in the test split")
    args = parser.parse_args()
    
    train(args.csv, args.epochs, args.lr, args.test_size)

