### Optional for inference logic

import torch
from ultralytics import YOLO

class YOLOCaptchaDetector:
    def __init__(self, model_path="best.pt"):
        self.model = YOLO(model_path)

    def detect(self, image):
        results = self.model(image)
        classes = results[0].boxes.cls.cpu().numpy()
        detected_captchas = any(cls == 0 for cls in classes)
        return "captcha" if detected_captchas else "no_captcha"
