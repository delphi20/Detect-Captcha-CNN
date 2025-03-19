"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import "./styles.css"

export default function CaptchaAnalyzer() {
  // State for image and analysis
  const [image, setImage] = useState<string | null>(null)
  const [isCaptcha, setIsCaptcha] = useState<boolean | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [boxes, setBoxes] = useState<Array<{ x: number; y: number; width: number; height: number }>>([])
  const [isDrawing, setIsDrawing] = useState(false)
  const [startPos, setStartPos] = useState({ x: 0, y: 0 })
  const [currentBox, setCurrentBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null)
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState<"upload" | "feedback">("upload")
  const [viewRendered, setViewRendered] = useState(false);
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);


  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      const reader = new FileReader()

      reader.onload = (event) => {
        if (event.target?.result) {
          setImage(event.target.result as string)
          setIsCaptcha(null)
          setBoxes([])
          setFeedbackSubmitted(false)
          setError(null)
        }
      }

      reader.readAsDataURL(file)
    }
  }

  // Analyze image for CAPTCHA
  const analyzeCaptcha = async () => {
    if (!image) return
  
    setIsAnalyzing(true)
    setError(null)
  
    try {
      // Convert base64 image to blob
      const response = await fetch(image)
      const blob = await response.blob()
      
  
      // Create a File from Blob with a proper MIME type
      const file = new File([blob], "captcha.jpg", { type: blob.type || "image/jpeg" })
  
      // Create form data to send to API
      const formData = new FormData()
      formData.append("image", file) // Send as File, not Blob
  
      // Call Flask API
      const apiResponse = await fetch("http://127.0.0.1:5000/predict", {
        method: "POST",
        body: formData,
      })
  
  
      if (!apiResponse.ok) {
        throw new Error(`API responded with status: ${apiResponse.status}`)
      }
  
      const data = await apiResponse.json()
      setIsCaptcha(data.isCaptcha)
      setActiveTab("feedback")
    } catch (error) {
      console.error("Error analyzing image:", error)
      setError("Failed to analyze image. Please try again or check if the Flask server is running.")
  
      // For testing without backend
      setIsCaptcha(true)
    } finally {
      setIsAnalyzing(false)
    }
  }
  
// New helper function to get a canvas with the image and boxes drawn
const getCanvasWithBoxes = (imageSource: string, boxList: Array<{ x: number; y: number; width: number; height: number }>): Promise<{ canvas: HTMLCanvasElement, img: HTMLImageElement }> => {
  return new Promise((resolve, reject) => {
    // Create a new canvas
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    console.log("running")
    if (!ctx) {
      reject(new Error("Could not get canvas context"));
      return;
    }
    
    // Create and load the image
    const img = new Image();
    img.crossOrigin = "anonymous";
    
    

    
    img.onload = () => {
      
      imageRef.current = img;
      
      // Set canvas dimensions to match image
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Draw original image on canvas
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Draw bounding boxes
      ctx.strokeStyle = "#FF0000";
      ctx.lineWidth = 3;
      boxList.forEach((box) => {
        ctx.strokeRect(box.x, box.y, box.width, box.height);
      });
      
      resolve({ canvas, img });
    };
    
    img.onerror = () => {
      reject(new Error("Failed to load image"));
    };
    
    img.src = imageSource;
    console.log(imageSource)
    
  });
};

// Get blob from canvas
const canvasToBlob = (canvas: HTMLCanvasElement, format = 'image/jpeg'): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("Failed to convert canvas to blob"));
      }
    }, format);
  });
};


  
// Refactored submitFeedback function
const submitFeedback = async (): Promise<void> => {
  if (!image) return;
  
  setIsSubmitting(true);
  setError(null);
  
  try {
    // Create a unique image ID (timestamp-based)
    const imageId = Date.now().toString();
    
    // Get canvas with image and boxes drawn
    const { canvas, img } = await getCanvasWithBoxes(image, boxes);
    
    // Convert canvas to blob
    const blob = await canvasToBlob(canvas);
    
    // Determine correct label (captcha or no_captcha)
    const correctLabel = boxes.length > 0 ? "captcha" : "no_captcha";
    
    // Prepare form data
    const formData = new FormData();
    formData.append("image_id", imageId); // Unique image ID
    formData.append("correct_label", correctLabel);
    formData.append("image", blob, `${imageId}.jpg`); // Image file
    
    // Prepare bounding box data
    if (boxes.length > 0) {
      const boxData = boxes.map(box => ({
        class_id: 0,  // YOLO class ID for "captcha"
        x_center: (box.x + box.width / 2) / img.width,  // Normalize x_center
        y_center: (box.y + box.height / 2) / img.height, // Normalize y_center
        width: box.width / img.width,  // Normalize width
        height: box.height / img.height // Normalize height
      }));
      
      formData.append("boxes", JSON.stringify(boxData)); // Send as JSON
    }
    
    // Send feedback to Flask API
    const feedbackResponse = await fetch("http://localhost:5000/feedback", {
      method: "POST",
      body: formData,
    });
    
    if (!feedbackResponse.ok) {
      throw new Error(`Feedback API responded with status: ${feedbackResponse.status}`);
    }
    
    setFeedbackSubmitted(true);
  } catch (error) {
    console.error("Error submitting feedback:", error);
    setError("Failed to submit feedback. Please try again or check if the Flask server is running.");
  } finally {
    setIsSubmitting(false);
  }
};


  // Clear all bounding boxes
  const clearBoxes = () => {
    setBoxes([])
    redrawCanvas()
  }

  // Redraw canvas with image and boxes
  const redrawCanvas = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    
    if (!canvas) {
      console.log("canvas is null or undefined");
      return;
      }
    if (!ctx) {
      console.log("ctx is null or undefined");
      return;
      }
    if (!imageRef.current) {
      console.log("imageRef.current is null or undefined");
      return;
      }

    canvas.width = imageRef.current.width
    canvas.height = imageRef.current.height
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(imageRef.current, 0, 0, canvas.width, canvas.height)
    console.log(imageRef.current)
    // Draw all saved boxes
    ctx.strokeStyle = "#FF0000"
    ctx.lineWidth = 2

    boxes.forEach((box) => {
      ctx.strokeRect(box.x, box.y, box.width, box.height)
    })

    // Draw current box if drawing
    if (currentBox) {
      ctx.strokeRect(currentBox.x, currentBox.y, currentBox.width, currentBox.height)
    }
  }

  // Mouse event handlers for drawing boxes
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return

    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    setIsDrawing(true)
    setStartPos({ x, y })
    setCurrentBox({ x, y, width: 0, height: 0 })
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
  if (!isDrawing || !canvasRef.current || !currentBox) return;

    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const width = x - startPos.x
    const height = y - startPos.y

    setCurrentBox({
      x: startPos.x,
      y: startPos.y,
      width,
      height,
    })

    redrawCanvas()
  }

  const handleMouseUp = () => {
    if (isDrawing && currentBox) {
      // Only add box if it has some size
      if (Math.abs(currentBox.width) > 5 && Math.abs(currentBox.height) > 5) {
        // Normalize box (handle negative width/height)
        const normalizedBox = {
          x: Math.min(startPos.x, startPos.x + currentBox.width),
          y: Math.min(startPos.y, startPos.y + currentBox.height),
          width: Math.abs(currentBox.width),
          height: Math.abs(currentBox.height),
        };

        setBoxes([...boxes, normalizedBox])
      }
    }

    setIsDrawing(false)
    setCurrentBox(null)
    redrawCanvas()
  }

  // Initialize canvas when image loads
  // Modify your image loading useEffect
// useEffect(() => {
//   if (!image) return;
  
//   const img = new Image();
//   img.crossOrigin = "anonymous";
  
//   img.onload = () => {
//     const canvas = canvasRef.current;
//     if (!canvas) {
      
//       console.log("Canvas not available");
//       return;
//     }
    
//     const ctx = canvas.getContext("2d");
//     if (!ctx) {
//       console.error("Failed to get 2D context");
//       return;
//     }
    
//     // Set canvas dimensions to match image
//     canvas.width = img.width;
//     canvas.height = img.height;
    
//     // Draw image on canvas
//     ctx.drawImage(img, 0, 0);
    
//     // Save image reference
//     imageRef.current = new Image();
//     imageRef.current.src = image;
    
//     // Now that everything is ready, redraw
//     redrawCanvas();
    
//     // Signal that the view is rendered
//     setViewRendered(true);
//   };
  
//   img.onerror = () => {
//     setError("Failed to load image");
//   };
  
//   img.src = image;
// }, [image]);


console.log(boxes)
useEffect(() => {
  if (!image) return;
  console.log("running")

  let isMounted = true;

  getCanvasWithBoxes(image, boxes)
    .then(({ canvas }) => canvasToBlob(canvas))
    .then((blob) => {
      if (isMounted) setImageBlob(blob);
    })
    .catch((error) => console.error("Error processing image:", error));
  return () => {
    isMounted = false;
  };
}, [image, boxes]);

  


  // Render upload view
  const renderUploadView = () => (
    <div className="upload-container">
      <h2>Upload Image</h2>
      <div className="upload-area" onClick={() => fileInputRef.current?.click()}>
        <p>Click to upload an image</p>
        <p className="small-text">Supported formats: JPEG, PNG, GIF</p>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden-input" onChange={handleFileChange} />
      </div>

      {image && (
        <button className="analyze-button" onClick={analyzeCaptcha} disabled={isAnalyzing}>
          {isAnalyzing ? "Analyzing..." : "Analyze Image"}
        </button>
      )}
    </div>
  )

  // Render feedback view
  const renderFeedbackView = () => (
    
    <div className="feedback-container">
      <h2>CAPTCHA Analysis</h2>

      <div className="canvas-container">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="drawing-canvas"
        />
      </div>

        

      <div className="button-group">
        <button className="analyze-button" onClick={analyzeCaptcha} disabled={isAnalyzing || !image}>
          {isAnalyzing ? "Analyzing..." : "Analyze Again"}
        </button>

        <button className="clear-button" onClick={clearBoxes} disabled={boxes.length === 0}>
          Clear Boxes
        </button>

        <button
          className="submit-button"
          onClick={submitFeedback}
          disabled={isSubmitting || boxes.length === 0 || feedbackSubmitted}
        >
          {isSubmitting ? "Submitting..." : "Submit Feedback"}
        </button>
      </div>

      
      {error && <div className="error-message">{error}</div>}

      {isCaptcha !== null && !error && (
        <div className={`result-message ${isCaptcha ? "captcha-found" : "no-captcha"}`}>
          {isCaptcha ? "This image contains a CAPTCHA" : "No CAPTCHA detected in this image"}
        </div>
      )}

      {feedbackSubmitted && !error && <div className="success-message">Feedback submitted successfully</div>}

      <div className="instructions">
        <h3>Instructions:</h3>
        <ul>
          <li>Click and drag to draw bounding boxes around CAPTCHA elements</li>
          <li>Click "Analyze Again" to recheck the image</li>
          <li>Click "Submit Feedback" to send your annotations</li>
        </ul>
      </div>
    </div>
  )

  return (
    <div className="app-container">
      {/* Simple Navigation */}
      <div className="nav-bar">
        <div className="app-title">CAPTCHA Analyzer</div>
        <div className="nav-buttons">
          <button
            className={`nav-button ${activeTab === "upload" ? "active" : ""}`}
            onClick={() => setActiveTab("upload")}
          >
            Upload
          </button>
          <button
            className={`nav-button ${activeTab === "feedback" ? "active" : ""}`}
            onClick={() => {
              if (image) {
                setActiveTab("feedback")
              }
            }}
            disabled={!image}
          >
            Feedback
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">{activeTab === "upload" ? renderUploadView() : renderFeedbackView()}</div>
    </div>
  )
}

