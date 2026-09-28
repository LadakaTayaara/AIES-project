"""
RF-DETR Training Script for Pothole Detection

RF-DETR (Roboflow Detection Transformer) provides significantly higher accuracy
than YOLOv8 for object detection, especially on small/medium objects.

This script:
  1. Converts the YOLO-format pothole dataset to COCO format (if needed)
  2. Fine-tunes RF-DETR Base on the pothole severity dataset
  3. Saves the best checkpoint for inference

Usage:
    python train.py

Requirements:
    pip install rfdetr supervision
"""

import os
import sys
import json
import shutil
from pathlib import Path

# ── Path configuration ───────────────────────────────────────────────
ML_DIR = Path(__file__).resolve().parent.parent.parent  # ml/
DATA_DIR = ML_DIR / "data"
YOLO_DATASET_DIR = DATA_DIR / "yolo_dataset"
COCO_DATASET_DIR = DATA_DIR / "coco_dataset"
WEIGHTS_DIR = ML_DIR / "model" / "weights" / "rfdetr_pothole"


def yolo_to_coco(yolo_dir: Path, coco_dir: Path, class_names: list[str]):
    """
    Convert a YOLO-format dataset to COCO format required by RF-DETR.

    YOLO format:
        images/train/  images/val/
        labels/train/  labels/val/

    COCO format:
        train/_annotations.coco.json + images
        valid/_annotations.coco.json + images
    """
    from PIL import Image as PILImage

    for split_yolo, split_coco in [("train", "train"), ("val", "valid")]:
        images_dir = yolo_dir / "images" / split_yolo
        labels_dir = yolo_dir / "labels" / split_yolo
        out_dir = coco_dir / split_coco

        if not images_dir.exists():
            print(f"  ⚠ Skipping {split_yolo} — {images_dir} not found")
            continue

        out_dir.mkdir(parents=True, exist_ok=True)

        coco = {
            "images": [],
            "annotations": [],
            "categories": [
                {"id": i, "name": name} for i, name in enumerate(class_names)
            ],
        }

        ann_id = 1
        image_files = sorted(images_dir.glob("*"))
        image_files = [f for f in image_files if f.suffix.lower() in (".jpg", ".jpeg", ".png", ".bmp")]

        for img_id, img_path in enumerate(image_files, start=1):
            # Copy image to output
            dst = out_dir / img_path.name
            if not dst.exists():
                shutil.copy2(img_path, dst)

            # Get image dimensions
            try:
                with PILImage.open(img_path) as im:
                    w, h = im.size
            except Exception:
                continue

            coco["images"].append({
                "id": img_id,
                "file_name": img_path.name,
                "width": w,
                "height": h,
            })

            # Read YOLO labels
            label_path = labels_dir / (img_path.stem + ".txt")
            if not label_path.exists():
                continue

            with open(label_path, "r") as f:
                for line in f:
                    parts = line.strip().split()
                    if len(parts) < 5:
                        continue

                    cls_id = int(parts[0])
                    cx, cy, bw, bh = map(float, parts[1:5])

                    # Convert YOLO (center x, center y, w, h) normalized → COCO (x, y, w, h) absolute
                    x = (cx - bw / 2) * w
                    y = (cy - bh / 2) * h
                    box_w = bw * w
                    box_h = bh * h

                    coco["annotations"].append({
                        "id": ann_id,
                        "image_id": img_id,
                        "category_id": cls_id,
                        "bbox": [round(x, 2), round(y, 2), round(box_w, 2), round(box_h, 2)],
                        "area": round(box_w * box_h, 2),
                        "iscrowd": 0,
                    })
                    ann_id += 1

        # Save annotations
        ann_path = out_dir / "_annotations.coco.json"
        with open(ann_path, "w") as f:
            json.dump(coco, f, indent=2)

        print(f"  ✓ {split_coco}: {len(coco['images'])} images, {len(coco['annotations'])} annotations")


def train():
    """Fine-tune RF-DETR on the pothole severity dataset."""

    # ── Check dependencies ───────────────────────────────────
    try:
        import torch
        print(f"PyTorch: {torch.__version__}")
        print(f"CUDA available: {torch.cuda.is_available()}")
        if torch.cuda.is_available():
            print(f"GPU: {torch.cuda.get_device_name(0)}")
    except ImportError:
        print("⚠ PyTorch not found — training may be limited to CPU")

    try:
        from rfdetr import RFDETRBase
    except ImportError:
        print("✕ rfdetr not installed. Run: pip install rfdetr")
        sys.exit(1)

    # ── Dataset conversion ───────────────────────────────────
    class_names = ["minor", "moderate", "severe"]

    if not COCO_DATASET_DIR.exists() or not (COCO_DATASET_DIR / "train" / "_annotations.coco.json").exists():
        print("\n── Converting YOLO dataset to COCO format ──")
        if not YOLO_DATASET_DIR.exists():
            print(f"✕ YOLO dataset not found at {YOLO_DATASET_DIR}")
            print("  Please ensure your dataset is at: ml/data/yolo_dataset/")
            print("  With structure: images/train/, images/val/, labels/train/, labels/val/")
            sys.exit(1)

        yolo_to_coco(YOLO_DATASET_DIR, COCO_DATASET_DIR, class_names)
        print("✓ Dataset conversion complete\n")
    else:
        print("✓ COCO dataset found — skipping conversion\n")

    # ── Create output directory ──────────────────────────────
    WEIGHTS_DIR.mkdir(parents=True, exist_ok=True)

    # ── Train RF-DETR ────────────────────────────────────────
    print("═" * 60)
    print("  RF-DETR Training — Pothole Severity Detection")
    print("  Classes: minor, moderate, severe")
    print(f"  Dataset: {COCO_DATASET_DIR}")
    print(f"  Output:  {WEIGHTS_DIR}")
    print("═" * 60)

    model = RFDETRBase()

    model.train(
        dataset_dir=str(COCO_DATASET_DIR),
        epochs=80,
        batch_size=4,
        grad_accum_steps=4,
        lr=1e-4,
        output_dir=str(WEIGHTS_DIR),
        num_classes=len(class_names),
    )

    print("\n" + "═" * 60)
    print(f"✓ Training complete!")
    print(f"  Weights saved to: {WEIGHTS_DIR}")
    print(f"  Use the best checkpoint for inference.")
    print("═" * 60)


if __name__ == "__main__":
    train()
