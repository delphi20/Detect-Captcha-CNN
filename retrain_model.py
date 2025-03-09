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
    feedback_images = os.listdir(FEEDBACK_DIR)
    # Assuming feedback images are in YOLO format (image and corresponding .txt labels)
    for image_name in feedback_images:
        if image_name.endswith('.jpg'):
            # Copy images and labels into the training data folder (train_data/images and train_data/labels)
            img_path = os.path.join(FEEDBACK_DIR, image_name)
            label_path = os.path.join(FEEDBACK_DIR, image_name.replace('.jpg', '.txt'))

            # Ensure both image and label files exist
            if os.path.exists(label_path):
                image_dest = os.path.join(TRAIN_DATA_DIR, 'images', image_name)
                label_dest = os.path.join(TRAIN_DATA_DIR, 'labels', image_name.replace('.jpg', '.txt'))
                os.makedirs(os.path.dirname(image_dest), exist_ok=True)
                os.makedirs(os.path.dirname(label_dest), exist_ok=True)

                # Move the image and label to the new folder
                os.rename(img_path, image_dest)
                os.rename(label_path, label_dest)

# Function to retrain the model
def retrain_model():
    """Retrains the YOLO model on new data."""
    model = YOLO(MODEL_PATH)  # Load the pretrained model
    
    # Set the model's training parameters (e.g., learning rate, epochs, etc.)
    # These values can be adjusted based on your specific needs
    model.train(
        data=TRAIN_DATA_DIR,  # Path to the training data folder
        epochs=5,             # Number of epochs to retrain
        batch=16,             # Batch size
        imgsz=640,            # Image size
        weights=MODEL_PATH,   # Path to the current model weights (starting point)
        name='retrained_model',  # Folder to save the retrained model
        save_period=1         # Save the model after every epoch
    )

# Function to periodically retrain the model
def periodic_retraining():
    """Retrains the model periodically."""
    while True:
        print("Preparing training data...")
        prepare_training_data()
        print("Retraining the model...")
        retrain_model()
        print("Retraining complete.")
        
        # Sleep for a period (e.g., retrain every 24 hours)
        print("Waiting for next retraining cycle...")
        time.sleep(86400)  # Wait for 24 hours (86400 seconds)

if __name__ == '__main__':
    periodic_retraining()
