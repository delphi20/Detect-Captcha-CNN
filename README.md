# Flask CAPTCHA Detection API with YOLOv8

This project provides a RESTful API built with Flask that can detect whether an image contains a CAPTCHA using a YOLOv8 model. The API exposes two main endpoints: `/predict` for detecting CAPTCHA images and `/feedback` for receiving feedback and storing images locally.

## Features
- **Predict**: Uses a YOLOv8 model to detect CAPTCHAs in uploaded images.
- **Feedback**: Accepts feedback on images (whether they contain a CAPTCHA or not) and saves the images locally.

## Getting Started

### Prerequisites
- Docker
- Python 3.9+
- `curl` for making requests

### Installation

Clone the repository to your local machine:

    git clone https://github.com/yourusername/your-repository-name.git 
    cd your-repository-name


### API Endpoints
#### 1. /predict - Detect CAPTCHA

This endpoint takes an image and predicts whether it contains a CAPTCHA.

Method: POST  
URL: http://localhost:5000/predict

**Request**

Use curl to send an image file for prediction:

    curl -X POST http://localhost:5000/predict -F "image=@path_to_image.jpg"

Replace `path_to_image.jpg` with the path to the image you want to analyze.

**Response**

The API will return a JSON response with the prediction result, such as:

```json
{
  "prediction": "captcha",
  "detections": 1
}
```

#### 2. /feedback - Submit Feedback on Images

This endpoint allows you to submit feedback on an image, which is saved locally for future analysis.

**Method:** POST  
**URL:** http://localhost:5000/feedback

**Request**

Use curl to send an image along with the feedback (correct label):

    curl -X POST http://localhost:5000/feedback \
      -F "image=@path_to_image.jpg" \
      -F "image_id=12345" \
      -F "correct_label=captcha"

Replace `path_to_image.jpg` with the image file you want to upload.  
Replace `12345` with a unique `image_id` for the feedback.  
Replace `captcha` with the correct label (can be `captcha` or `no_captcha`).

**Response**

The API will return a JSON response confirming that the feedback and image were saved:

```json
{
  "message": "Feedback received and image saved"
}
```

### Docker Setup

If you'd like to set up the application using Docker, you can follow these steps:

**Build the Docker image:**

    docker build -t captcha-detection .

**Run the Docker container:**

    docker run -p 5000:5000 captcha-detection

Or use docker compose, in the project directory:

    docker-compose up --build

The Flask application will now be running and accessible at http://localhost:5000/.

## Additional Information

For more details, you can check out the full documentation at the following link: ChatGPT Information

## Troubleshooting

If you're encountering issues with starting the container or accessing the API, please make sure that the Docker container is running correctly, and the ports are mapped properly (`5000:5000`).

For additional help, consult the official Flask and YOLOv8 documentation.
