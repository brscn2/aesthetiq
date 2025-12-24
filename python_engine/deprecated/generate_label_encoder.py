import os
import pickle
from sklearn.preprocessing import LabelEncoder

# Define standard 12 Seasons (Must match train.py exactly)
SEASON_ORDER = [
    "DARK AUTUMN", "DARK WINTER", 
    "LIGHT SPRING", "LIGHT SUMMER",
    "MUTED AUTUMN", "MUTED SUMMER", 
    "BRIGHT SPRING", "BRIGHT WINTER",
    "WARM AUTUMN", "WARM SPRING", 
    "COOL WINTER", "COOL SUMMER"
]

def generate_encoder():
    print("Generating LabelEncoder...")
    le = LabelEncoder()
    le.fit(SEASON_ORDER)
    
    # Verify classes
    print(f"Classes found: {le.classes_}")
    
    # Ensure weights directory exists
    # Note: When running from deprecated/, we might need to adjust path or assume running from root
    # Assuming running from python_engine root as before
    os.makedirs("weights", exist_ok=True)
    
    save_path = os.path.join("weights", "season_label_encoder.pkl")
    with open(save_path, 'wb') as f:
        pickle.dump(le, f)
    
    print(f"Successfully saved LabelEncoder to {save_path}")

if __name__ == "__main__":
    generate_encoder()
