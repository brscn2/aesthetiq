
import os
import sys

# Add the parent directory (python_engine) to sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.append(parent_dir)

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms, models
from PIL import Image
import pandas as pd
import pickle
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from tqdm import tqdm
from core.preprocessing import Preprocessor

# Define standard 12 Seasons
SEASON_ORDER = [
    "DARK AUTUMN", "DARK WINTER", 
    "LIGHT SPRING", "LIGHT SUMMER",
    "MUTED AUTUMN", "MUTED SUMMER", 
    "BRIGHT SPRING", "BRIGHT WINTER",
    "WARM AUTUMN", "WARM SPRING", 
    "COOL WINTER", "COOL SUMMER"
]

def map_italian_season(cls, sub_cls):
    season_map = {
        "autunno": "AUTUMN", "inverno": "WINTER",
        "primavera": "SPRING", "estate": "SUMMER"
    }
    sub_map = {
        "deep": "DARK", "light": "LIGHT", "cool": "COOL",
        "warm": "WARM", "soft": "MUTED", "bright": "BRIGHT", "clear": "BRIGHT"
    }
    s = season_map.get(cls.lower(), cls.upper())
    sub = sub_map.get(sub_cls.lower(), sub_cls.upper())
    return f"{sub} {s}"

class SeasonDataset(Dataset):
    def __init__(self, df, root_dir, transform=None):
        self.df = df
        self.root_dir = root_dir
        self.transform = transform
        self.preprocessor = Preprocessor()

    def __len__(self):
        return len(self.df)

    def __getitem__(self, idx):
        row = self.df.iloc[idx]
        
        # Path Correction
        rel_path = row['path_rgb_original']
        if rel_path.startswith("MERGED_RGB_original"):
            rel_path = rel_path.replace("MERGED_RGB_original", "RGB")
        
        img_path = os.path.join(self.root_dir, rel_path)
        
        try:
            image = Image.open(img_path).convert("RGB")
            
            # 1. Detection & Crop (Crucial step)
            # We use 30% padding to keep context
            processed_img = self.preprocessor.process(image)
            
            # 2. Transform (Resize, Normalize)
            if self.transform:
                processed_img = self.transform(processed_img)
                
            label = row['encoded_label']
            return processed_img, label
            
        except Exception as e:
            # Return a dummy black image if file fails (shouldn't happen often)
            print(f"Error loading {img_path}: {e}")
            return torch.zeros((3, 224, 224)), row['encoded_label']

def train_resnet(dataset_root, epochs=20, batch_size=32, lr=0.001):
    # Enable MPS (Metal Performance Shaders) for Apple Silicon (M1/M2/M3)
    if torch.backends.mps.is_available():
        device = torch.device("mps")
        print("Using device: MPS (Apple Silicon GPU)")
    elif torch.cuda.is_available():
        device = torch.device("cuda")
        print("Using device: CUDA")
    else:
        device = torch.device("cpu")
        print("Using device: CPU")

    # 1. Prepare Data
    csv_path = os.path.join(dataset_root, "annotations.csv")
    xlsx_path = os.path.join(dataset_root, "annotations.xlsx")
    
    if os.path.exists(csv_path):
        df = pd.read_csv(csv_path)
    elif os.path.exists(xlsx_path):
        df = pd.read_excel(xlsx_path)
    else:
        print("Annotations file not found")
        return

    # Filter & Map Labels
    df['mapped_label'] = df.apply(lambda x: map_italian_season(x['class'], x['sub_class']), axis=1)
    df = df[df['mapped_label'].isin(SEASON_ORDER)]
    
    le = LabelEncoder()
    le.fit(SEASON_ORDER)
    df['encoded_label'] = le.transform(df['mapped_label'])
    
    # Save LabelEncoder artifact
    os.makedirs("weights", exist_ok=True)
    le_path = os.path.join("weights", "season_label_encoder.pkl")
    with open(le_path, 'wb') as f:
        pickle.dump(le, f)
    print(f"LabelEncoder saved to {le_path}")
    
    # Split
    train_df, val_df = train_test_split(df, test_size=0.2, stratify=df['encoded_label'], random_state=42)
    print(f"Train: {len(train_df)} | Val: {len(val_df)}")

    # Transforms (ResNet Standard)
    data_transforms = {
        'train': transforms.Compose([
            transforms.Resize((256, 256)),
            transforms.RandomCrop(224),
            transforms.RandomHorizontalFlip(),
            transforms.RandomRotation(10),
            transforms.ColorJitter(brightness=0.1, contrast=0.1, saturation=0.1, hue=0.05),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
        ]),
        'val': transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
        ]),
    }

    train_dataset = SeasonDataset(train_df, dataset_root, data_transforms['train'])
    val_dataset = SeasonDataset(val_df, dataset_root, data_transforms['val'])

    dataloaders = {
        'train': DataLoader(train_dataset, batch_size=batch_size, shuffle=True, num_workers=0),
        'val': DataLoader(val_dataset, batch_size=batch_size, shuffle=False, num_workers=0)
    }

    # 2. Setup Model (ResNet18)
    model = models.resnet18(weights=models.ResNet18_Weights.IMAGENET1K_V1)
    
    # Fine-tune: Replace last layer
    num_ftrs = model.fc.in_features
    model.fc = nn.Linear(num_ftrs, len(SEASON_ORDER))
    
    model = model.to(device)

    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=lr)
    # Note: verbose=True is deprecated in newer PyTorch versions for ReduceLROnPlateau, removed it to be safe
    scheduler = optim.lr_scheduler.ReduceLROnPlateau(optimizer, 'min', patience=3)

    # 3. Training Loop
    best_acc = 0.0
    
    for epoch in range(epochs):
        print(f'Epoch {epoch+1}/{epochs}')
        print('-' * 10)

        for phase in ['train', 'val']:
            if phase == 'train':
                model.train()
            else:
                model.eval()

            running_loss = 0.0
            running_corrects = 0

            # Iterate over data
            for inputs, labels in tqdm(dataloaders[phase]):
                inputs = inputs.to(device)
                labels = labels.to(device)

                optimizer.zero_grad()

                with torch.set_grad_enabled(phase == 'train'):
                    outputs = model(inputs)
                    _, preds = torch.max(outputs, 1)
                    loss = criterion(outputs, labels)

                    if phase == 'train':
                        loss.backward()
                        optimizer.step()

                running_loss += loss.item() * inputs.size(0)
                running_corrects += torch.sum(preds == labels.data)

            epoch_loss = running_loss / len(dataloaders[phase].dataset)
            # MPS doesn't support double (float64), use float() (float32)
            epoch_acc = running_corrects.float() / len(dataloaders[phase].dataset)

            print(f'{phase} Loss: {epoch_loss:.4f} Acc: {epoch_acc:.4f}')

            if phase == 'val':
                scheduler.step(epoch_loss)
                if epoch_acc > best_acc:
                    best_acc = epoch_acc
                    torch.save(model.state_dict(), 'season_resnet18.pth')
                    print("Saved best model!")

    print(f'Best Val Acc: {best_acc:4f}')

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", type=str, required=True)
    parser.add_argument("--epochs", type=int, default=20)
    args = parser.parse_args()
    
    train_resnet(args.data, args.epochs)

