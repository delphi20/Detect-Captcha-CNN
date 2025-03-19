import threading
import os
import cv2
import numpy as np
from flask import Flask, request, jsonify
from ultralytics import YOLO
from dotenv import load_dotenv
from retrain import prepare_training_data, retrain_model
from apscheduler.schedulers.background import BackgroundScheduler
from flask_cors import CORS  # Import CORS
import json

# Create a lock object to ensure thread-safe model loading
lock = threading.Lock()

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)


# Define directory structure
BASE_DIR = r"backend\train_data"
IMAGE_DIR = os.path.join(BASE_DIR, "images")
LABEL_DIR = os.path.join(BASE_DIR, "labels")

# Ensure necessary directories exist
for category in ["captcha", "no_captcha"]:
    os.makedirs(os.path.join(IMAGE_DIR, category), exist_ok=True)
    os.makedirs(os.path.join(LABEL_DIR, category), exist_ok=True)

# Global variable for YOLO model
model = None

def load_yolo_model():
    global model
    # Acquire the lock to ensure that only one thread loads the model
    with lock:
        if model is None:
            try:
                model = YOLO(r"backend\best.pt")
                print("YOLO Model Loaded Successfully")
            except Exception as e:
                print(f"YOLO Model Loading Error: {e}")
                model = None

# Load the model only once when the server starts
load_yolo_model()

def process_image(image):
    """Runs YOLOv8 on an image and returns detection results."""
    try:
        results = model(image)
        classes = results[0].boxes.cls.cpu().numpy()
        detected_captchas = any(cls == 0 for cls in classes)
        isCaptcha = True if detected_captchas else False

        return {"isCaptcha": isCaptcha, "detections": len(classes)}
    except Exception as e:
        return {"error": f"Failed to process image: {str(e)}"}

# image saving function
def save_feedback_image(image, image_id, category):
    """Saves the image in the appropriate category folder."""
    image_filename = os.path.join(IMAGE_DIR, category, f"{image_id}.jpg")
    cv2.imwrite(image_filename, image)
  
# label creating and saving to file  
def save_feedback_label(image_id, boxes, category):
    """Saves bounding box labels in YOLO format."""
    label_filename = os.path.join(LABEL_DIR, category, f"{image_id}.txt")
    
    with open(label_filename, "w") as f:
        if category == "captcha":
            for box in boxes:
                f.write(f"{box['class_id']} {box['x_center']} {box['y_center']} {box['width']} {box['height']}\n")
        else:
            # Create an empty file for "no_captcha" images
            f.write("")

@app.route('/predict', methods=['POST'])
def predict():
    """Handles image uploads and returns detection results."""
    if 'image' not in request.files:
        return jsonify({"error": "No image uploaded"}), 400

    file = request.files['image']
    image = cv2.imdecode(np.frombuffer(file.read(), np.uint8), cv2.IMREAD_COLOR)

    if model is None:
        return jsonify({"error": "Model not loaded"}), 500

    results = process_image(image)
    return jsonify(results)

@app.route('/feedback', methods=['POST'])
def feedback():
    """Receive user feedback and store images and labels correctly for YOLO retraining."""
    image_id = request.form.get('image_id')
    correct_label = request.form.get('correct_label')  # "captcha" or "no_captcha"
    boxes = request.form.get('boxes')

    if not image_id or not correct_label:
        return jsonify({"error": "Invalid data"}), 400

    if 'image' not in request.files:
        return jsonify({"error": "No image uploaded for feedback"}), 400

    file = request.files['image']
    image = cv2.imdecode(np.frombuffer(file.read(), np.uint8), cv2.IMREAD_COLOR)

    # Save image in the appropriate folder
    save_feedback_image(image, image_id, correct_label)

    # Save bounding box labels (or an empty label file for "no_captcha")
    if correct_label == "captcha" and boxes:
        try:
            boxes = json.loads(boxes)  # Convert JSON string to list
            save_feedback_label(image_id, boxes, correct_label)
        except json.JSONDecodeError:
            return jsonify({"error": "Invalid bounding box format"}), 400
    else:
        save_feedback_label(image_id, [], correct_label)

    return jsonify({"message": "Feedback received and image saved"}), 200


def retraining_job():
    """Retrains the model only if new feedback images are available."""
    print("Checking for new feedback images...")
    if prepare_training_data():
        print("New data found! Retraining model...")
        retrain_model()
        print("Retraining complete.")
    else:
        print("No new data found. Skipping retraining.")

# Set up the scheduler
scheduler = BackgroundScheduler()
scheduler.add_job(retraining_job, 'interval', hours=24)  # Retrain every 24 hours
scheduler.start()


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
