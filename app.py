from flask import Flask, request, jsonify
import cv2
import numpy as np
# import torch
from ultralytics import YOLO

# Initialize Flask app
app = Flask(__name__)

# Load YOLO model
model = YOLO("best.pt")

def process_image(image):
    """Runs YOLOv8 on an image and returns detection results."""
    results = model(image)
    
    # Process detections
    classes = results[0].boxes.cls.cpu().numpy()
    detected_captchas = any(cls == 0 for cls in classes)
    predicted_label = "captcha" if detected_captchas else "no_captcha"
    
    return {
        "prediction": predicted_label,
        "detections": len(classes),
    }

@app.route('/predict', methods=['POST'])
def predict():
    """Handles image uploads and returns detection results."""
    if 'image' not in request.files:
        return jsonify({"error": "No image uploaded"}), 400
    
    file = request.files['image']
    image = cv2.imdecode(np.frombuffer(file.read(), np.uint8), cv2.IMREAD_COLOR)

    results = process_image(image)
    return jsonify(results)




if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
