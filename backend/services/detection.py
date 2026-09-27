import io
import uuid
from PIL import Image
from ultralytics import YOLO
from utils.config import settings

# Severity mapping from YOLO class IDs
SEVERITY_MAP = {
    0: "minor",
    1: "moderate",
    2: "severe"
}

# Load model once at startup
model = None

def load_model():
    global model
    if model is None:
        model = YOLO(settings.YOLO_MODEL_PATH)
        model.to(settings.DEVICE)
    return model

async def run_detection(image_bytes: bytes, lat: float, lng: float, description: str = None):
    """
    Run YOLOv8 inference on uploaded image.
    Returns severity classification and confidence score.
    """
    yolo = load_model()

    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    results = yolo(image)

    # Parse detections
    severity = "minor"
    confidence = 0.0

    if results and len(results[0].boxes) > 0:
        boxes = results[0].boxes
        # Take highest confidence detection
        best_idx = boxes.conf.argmax().item()
        class_id = int(boxes.cls[best_idx].item())
        confidence = float(boxes.conf[best_idx].item())
        severity = SEVERITY_MAP.get(class_id, "minor")

    return {
        "report_id": str(uuid.uuid4()),
        "severity": severity,
        "confidence": round(confidence, 3),
        "lat": lat,
        "lng": lng,
        "status": "reported"
    }
