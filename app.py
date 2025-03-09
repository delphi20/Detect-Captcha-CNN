import threading
import os
import cv2
import numpy as np
from flask import Flask, request, jsonify
from ultralytics import YOLO
from dotenv import load_dotenv

# Create a lock object to ensure thread-safe model loading
lock = threading.Lock()

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Directory to save feedback images
FEEDBACK_DIR = "feedback_images"
os.makedirs(FEEDBACK_DIR, exist_ok=True)

# Global variable for YOLO model
model = None

def load_yolo_model():
    global model
    # Acquire the lock to ensure that only one thread loads the model
    with lock:
        if model is None:
            try:
                model = YOLO("best.pt")
                print("✅ YOLO Model Loaded Successfully")
            except Exception as e:
                print(f"❌ YOLO Model Loading Error: {e}")
                model = None

# Load the model only once when the server starts
load_yolo_model()

def process_image(image):
    """Runs YOLOv8 on an image and returns detection results."""
    try:
        results = model(image)
        classes = results[0].boxes.cls.cpu().numpy()
        detected_captchas = any(cls == 0 for cls in classes)
        predicted_label = "captcha" if detected_captchas else "no_captcha"

        return {"prediction": predicted_label, "detections": len(classes)}
    except Exception as e:
        return {"error": f"Failed to process image: {str(e)}"}

def save_feedback_image(image, image_id):
    """Saves the feedback image locally."""
    image_filename = os.path.join(FEEDBACK_DIR, f"{image_id}.jpg")
    cv2.imwrite(image_filename, image)

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
@app.route('/feedback', methods=['POST'])
def feedback():
    """Receive user feedback and store only the images locally."""
    # Get form data instead of JSON
    image_id = request.form.get('image_id')
    correct_label = request.form.get('correct_label')

    if not image_id or not correct_label:
        return jsonify({"error": "Invalid data"}), 400

    if 'image' not in request.files:
        return jsonify({"error": "No image uploaded for feedback"}), 400

    file = request.files['image']
    image = cv2.imdecode(np.frombuffer(file.read(), np.uint8), cv2.IMREAD_COLOR)

    # Save the feedback image locally
    save_feedback_image(image, image_id)

    return jsonify({"message": "Feedback received and image saved"}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
