import os
import time
from ultralytics import YOLO
from pathlib import Path

# Directory where your feedback images are stored
FEEDBACK_DIR = "feedback_images"
# Path to store the best model
MODEL_PATH = "best.pt"
# Directory for training data (must be in YOLO format)
TRAIN_DATA_DIR = "train_data"

# Check if the training data directory exists
os.makedirs(TRAIN_DATA_DIR, exist_ok=True)

# Function to collect feedback images into the training data folder
def prepare_training_data():
    """Prepare the new training data from feedback images."""
    feedback_images = [f for f in os.listdir(FEEDBACK_DIR) if f.endswith('.jpg')]
    new_data_found = False

    for image_name in feedback_images:
        label_path = os.path.join(FEEDBACK_DIR, image_name.replace('.jpg', '.txt'))
        if os.path.exists(label_path):
            img_dest = os.path.join(TRAIN_DATA_DIR, 'images', image_name)
            label_dest = os.path.join(TRAIN_DATA_DIR, 'labels', image_name.replace('.jpg', '.txt'))
            os.makedirs(os.path.dirname(img_dest), exist_ok=True)
            os.makedirs(os.path.dirname(label_dest), exist_ok=True)

            os.rename(os.path.join(FEEDBACK_DIR, image_name), img_dest)
            os.rename(label_path, label_dest)
            new_data_found = True  # Set flag if we find new data

    return new_data_found

def retrain_model():
    """Retrains the YOLO model only if new data is available."""
    model = YOLO(MODEL_PATH)
    model.train(
        data=TRAIN_DATA_DIR,
        epochs=5,
        batch=16,
        imgsz=640,
        weights=MODEL_PATH,
        name='retrained_model',
        save_period=1
    )

# if __name__ == '__main__':
#     periodic_retraining()
