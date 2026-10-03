"""
RF-DETR based pothole detection service.

Uses Roboflow's RF-DETR (DETR-based) model for high-accuracy object detection.
RF-DETR achieves higher mAP than YOLOv8 on standard benchmarks and provides
better accuracy for small/medium objects like potholes.

Fallback chain:
  1. Fine-tuned RF-DETR weights (from training on pothole dataset)
  2. Pre-trained RF-DETR base model (COCO — for architecture validation)
"""

import io
import os
import uuid
import json
import logging
from datetime import datetime
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

from utils.config import settings

logger = logging.getLogger("detection")

# ── Severity configuration ──────────────────────────────────────────
SEVERITY_MAP = {
    0: "minor",
    1: "moderate",
    2: "severe",
}

SEVERITY_COLORS = {
    "minor":    (16, 185, 129),   # emerald
    "moderate": (245, 158, 11),   # amber
    "severe":   (239, 68, 68),    # red
    "unknown":  (107, 114, 128),  # gray
}

# ── Storage directories ─────────────────────────────────────────────
UPLOAD_DIR = Path(__file__).parent.parent / "uploads"
ANNOTATED_DIR = Path(__file__).parent.parent / "annotated"
UPLOAD_DIR.mkdir(exist_ok=True)
ANNOTATED_DIR.mkdir(exist_ok=True)

# ── Model singleton ─────────────────────────────────────────────────
_model = None
_model_type = None  # "finetuned" | "base" | None


class YOLOModelWrapper:
    """Wrapper around Ultralytics YOLO to match RF-DETR predict interface."""
    def __init__(self, weights_path: str):
        from ultralytics import YOLO
        self.model = YOLO(weights_path)

    def predict(self, image_path: str, threshold: float = 0.3):
        import supervision as sv
        results = self.model.predict(image_path, conf=threshold, verbose=False)
        if results and len(results) > 0:
            return sv.Detections.from_ultralytics(results[0])
        return sv.Detections.empty()


def load_model():
    """
    Load the detection model. Tries fine-tuned weights first, then fallback base model.
    The model is loaded once and cached globally.
    """
    global _model, _model_type

    if _model is not None:
        return _model, _model_type

    # ── 1. Try newly trained fine-tuned YOLO11/YOLO model ───────────
    ml_weights_dir = Path(__file__).parent.parent.parent / "ml" / "model" / "weights"
    yolo_candidates = [
        ml_weights_dir / "yolo11s_pothole_severity" / "weights" / "best.pt",
        ml_weights_dir / "yolov8_pothole" / "weights" / "best.pt",
    ]
    for candidate in yolo_candidates:
        if candidate.exists():
            try:
                _model = YOLOModelWrapper(str(candidate))
                _model_type = "finetuned"
                logger.info(f"Loaded fine-tuned YOLO severity model from {candidate}")
                return _model, _model_type
            except Exception as e:
                logger.warning(f"Failed to load YOLO model from {candidate}: {e}")

    # ── 2. Try fine-tuned RF-DETR weights ──────────────────────────
    weights_path = settings.RFDETR_WEIGHTS_PATH
    if weights_path and os.path.isfile(weights_path):
        try:
            from rfdetr import RFDETRBase
            _model = RFDETRBase(pretrain_weights=weights_path)
            _model_type = "finetuned"
            logger.info(f"Loaded fine-tuned RF-DETR from {weights_path}")
            return _model, _model_type
        except Exception as e:
            logger.warning(f"Failed to load fine-tuned RF-DETR weights: {e}")

    # ── 3. Fall back to pre-trained base model ─────────────────────
    try:
        from rfdetr import RFDETRBase
        _model = RFDETRBase()
        _model_type = "base"
        logger.info("Loaded base RF-DETR model (COCO pre-trained)")
        return _model, _model_type
    except Exception as e:
        logger.error(f"Failed to load RF-DETR base model: {e}")
        _model_type = None
        return None, None


def _annotate_image_pillow(image: Image.Image, detections: list) -> Image.Image:
    """
    Draw bounding boxes and labels on the image using Pillow.
    Fallback when supervision is not available.
    """
    draw = ImageDraw.Draw(image)

    try:
        font = ImageFont.truetype("arial.ttf", 16)
    except (IOError, OSError):
        font = ImageFont.load_default()

    for det in detections:
        bbox = det["bbox"]
        severity = det["severity"]
        conf = det["confidence"]
        color = SEVERITY_COLORS.get(severity, SEVERITY_COLORS["unknown"])

        x1, y1, x2, y2 = bbox
        draw.rectangle([x1, y1, x2, y2], outline=color, width=3)

        label = f"{severity.upper()} {conf:.0%}"
        text_bbox = draw.textbbox((x1, y1 - 20), label, font=font)
        draw.rectangle(
            [text_bbox[0] - 2, text_bbox[1] - 2, text_bbox[2] + 2, text_bbox[3] + 2],
            fill=color
        )
        draw.text((x1, y1 - 20), label, fill=(255, 255, 255), font=font)

    return image


def _estimate_severity_from_bbox(bbox: list, image_size: tuple, confidence: float) -> str:
    """
    Heuristic severity estimation based on bounding box area ratio and confidence.
    Used when the model outputs class IDs that don't map to our severity scale
    (e.g., COCO pre-trained model).
    """
    x1, y1, x2, y2 = bbox
    bbox_area = (x2 - x1) * (y2 - y1)
    img_area = image_size[0] * image_size[1]
    area_ratio = bbox_area / max(img_area, 1)

    if area_ratio > 0.08 or confidence > 0.85:
        return "severe"
    elif area_ratio > 0.03 or confidence > 0.6:
        return "moderate"
    else:
        return "minor"


async def run_detection(
    image_bytes: bytes,
    lat: float,
    lng: float,
    description: str = None
) -> dict:
    """
    Run RF-DETR inference on an uploaded image.

    Returns a dictionary with:
      - report_id, severity, confidence, coordinates
      - paths to original and annotated images
      - list of all detections
    """
    report_id = str(uuid.uuid4())

    # ── Save original image ──────────────────────────────────────
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    original_filename = f"{report_id}_original.jpg"
    original_path = UPLOAD_DIR / original_filename
    image.save(str(original_path), quality=90)

    # ── Defaults ─────────────────────────────────────────────────
    severity = "unknown"
    confidence = 0.0
    detections_data = []
    annotated_url = None

    # ── Load model & run inference ───────────────────────────────
    model, model_type = load_model()

    if model is None:
        logger.warning("No model available — returning unprocessed report")
        severity = "unknown"
        confidence = 0.0
    else:
        try:
            # RF-DETR prediction
            sv_detections = model.predict(
                str(original_path),
                threshold=settings.CONFIDENCE_THRESHOLD
            )

            if sv_detections is not None and len(sv_detections) > 0:
                best_conf = 0.0
                best_severity = "minor"

                for i in range(len(sv_detections)):
                    conf = float(sv_detections.confidence[i])
                    cls_id = int(sv_detections.class_id[i])
                    bbox = sv_detections.xyxy[i].tolist()

                    # Determine severity
                    if model_type == "finetuned":
                        sev = SEVERITY_MAP.get(cls_id, "minor")
                    else:
                        sev = _estimate_severity_from_bbox(
                            bbox, image.size, conf
                        )

                    det_entry = {
                        "class_id": cls_id,
                        "confidence": round(conf, 4),
                        "bbox": [round(b, 2) for b in bbox],
                        "severity": sev,
                    }
                    detections_data.append(det_entry)

                    if conf > best_conf:
                        best_conf = conf
                        best_severity = sev

                confidence = round(best_conf, 4)
                severity = best_severity

                # ── Create annotated image ───────────────────────
                try:
                    import supervision as sv
                    image_np = np.array(image)
                    box_annotator = sv.BoxAnnotator(thickness=3)
                    label_annotator = sv.LabelAnnotator(
                        text_scale=0.7, text_thickness=2
                    )

                    labels = []
                    for det in detections_data:
                        labels.append(
                            f"{det['severity'].upper()} {det['confidence']:.0%}"
                        )

                    annotated_np = box_annotator.annotate(
                        scene=image_np.copy(),
                        detections=sv_detections,
                    )
                    annotated_np = label_annotator.annotate(
                        scene=annotated_np,
                        detections=sv_detections,
                        labels=labels,
                    )

                    annotated_img = Image.fromarray(annotated_np)
                except Exception:
                    # Fallback to Pillow annotation
                    annotated_img = _annotate_image_pillow(
                        image.copy(), detections_data
                    )

                annotated_filename = f"{report_id}_annotated.jpg"
                annotated_path = ANNOTATED_DIR / annotated_filename
                annotated_img.save(str(annotated_path), quality=90)
                annotated_url = f"/annotated/{annotated_filename}"

            else:
                # No detections found
                severity = "none"
                confidence = 0.0

        except Exception as e:
            logger.error(f"Detection failed: {e}", exc_info=True)
            severity = "error"
            confidence = 0.0

    return {
        "report_id": report_id,
        "severity": severity,
        "confidence": confidence,
        "lat": lat,
        "lng": lng,
        "description": description,
        "status": "reported",
        "image_path": f"/uploads/{original_filename}",
        "annotated_image_path": annotated_url,
        "detections": detections_data,
        "num_detections": len(detections_data),
        "model_type": model_type or "unavailable",
        "created_at": datetime.utcnow().isoformat(),
    }
