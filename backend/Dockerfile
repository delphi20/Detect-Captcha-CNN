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


# Set default MongoDB URI (can be overridden at runtime)
ENV MONGO_URI="mongodb+srv://delphi:Brooklyn9174@cluster0.myvpycu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"

# Run the application
CMD ["python", "app.py"]
