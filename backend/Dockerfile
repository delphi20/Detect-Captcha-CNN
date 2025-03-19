# Use an official lightweight Python image
FROM python:3.9-slim

# Set working directory
WORKDIR /app

# Copy necessary files
COPY requirements.txt .
COPY app.py .
COPY best.pt .
COPY yolo_model.py .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Expose port
EXPOSE 5000




# Run the application
CMD ["python", "app.py"]
