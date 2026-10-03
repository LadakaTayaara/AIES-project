"""
Production Training Pipeline: YOLO11 & RF-DETR
===============================================
Trains models on the ASTM D6433 3-class severity dataset (minor, moderate, severe)
to surpass the base paper's 78.7% mAP@50 baseline.

Usage:
    # Train YOLO11 Small (recommended balance of accuracy and speed):
    python train_pipeline.py --model yolo11s.pt --epochs 50 --batch 16

    # Train YOLO11 Medium (higher capacity):
    python train_pipeline.py --model yolo11m.pt --epochs 60 --batch 8

    # Train RF-DETR:
    python train_pipeline.py --model rfdetr --epochs 60 --batch 4
"""

import os
import sys
import argparse
from pathlib import Path

# Paths
ML_DIR = Path(__file__).resolve().parent.parent.parent
ROOT_DIR = ML_DIR.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

DATA_YAML = ML_DIR / "data" / "pothole_dataset.yaml"
COCO_DIR = ML_DIR / "data" / "coco_dataset"
WEIGHTS_DIR = ML_DIR / "model" / "weights"


def train_yolo(model_name: str = "yolo11s.pt", epochs: int = 50, batch: int = 16, imgsz: int = 640):
    from ultralytics import YOLO

    print("=" * 70)
    print(f"  STARTING YOLO TRAINING: {model_name}")
    print(f"  Dataset: {DATA_YAML}")
    print(f"  Epochs:  {epochs} | Batch: {batch} | Image Size: {imgsz}")
    print("=" * 70)

    model = YOLO(model_name)

    run_name = f"{Path(model_name).stem}_pothole_severity"
    results = model.train(
        data=str(DATA_YAML),
        epochs=epochs,
        batch=batch,
        imgsz=imgsz,
        device="0",
        workers=2,              # Windows-safe multiprocessing
        project=str(WEIGHTS_DIR),
        name=run_name,
        exist_ok=True,
        pretrained=True,
        optimizer="AdamW",
        lr0=0.001,
        cos_lr=True,            # Cosine learning rate decay
        mosaic=1.0,             # Rich data augmentation
        mixup=0.1,
        save=True,
        plots=True,
        verbose=True
    )

    best_weights = Path(results.save_dir) / "weights" / "best.pt"
    print("\n" + "=" * 70)
    print(f"  TRAINING COMPLETE!")
    print(f"  Best Weights Saved: {best_weights}")
    print("=" * 70)

    # Automatically run evaluation benchmark
    eval_script = ML_DIR / "model" / "evaluate_benchmark.py"
    if eval_script.exists():
        print("\nRunning Evaluation Benchmark on Test Split...")
        from ml.model.evaluate_benchmark import evaluate_model
        evaluate_model(str(best_weights), f"{Path(model_name).stem.upper()} Severity")


def train_rfdetr(epochs: int = 50, batch: int = 4):
    try:
        from rfdetr import RFDETRSmall
    except ImportError:
        try:
            from rfdetr import RFDETRBase as RFDETRSmall
        except ImportError:
            print("Error: rfdetr package is not properly configured. Use YOLO11 instead.")
            return

    print("=" * 70)
    print("  STARTING RF-DETR TRAINING")
    print(f"  COCO Dataset: {COCO_DIR}")
    print(f"  Epochs: {epochs} | Batch: {batch}")
    print("=" * 70)

    out_dir = WEIGHTS_DIR / "rfdetr_pothole"
    out_dir.mkdir(parents=True, exist_ok=True)

    model = RFDETRSmall()
    model.train(
        dataset_dir=str(COCO_DIR),
        epochs=epochs,
        batch_size=batch,
        grad_accum_steps=4,
        lr=1e-4,
        output_dir=str(out_dir),
        num_classes=3,
    )
    print(f"RF-DETR Training Complete! Weights at {out_dir}")


def main():
    parser = argparse.ArgumentParser(description="Train Pothole Detection Model")
    parser.add_argument("--model", type=str, default="yolo11s.pt", help="yolo11n.pt, yolo11s.pt, yolo11m.pt, or rfdetr")
    parser.add_argument("--epochs", type=int, default=50, help="Number of training epochs")
    parser.add_argument("--batch", type=int, default=16, help="Batch size")
    parser.add_argument("--imgsz", type=int, default=640, help="Image size")
    args = parser.parse_args()

    if args.model.lower() == "rfdetr":
        train_rfdetr(epochs=args.epochs, batch=args.batch)
    else:
        train_yolo(model_name=args.model, epochs=args.epochs, batch=args.batch, imgsz=args.imgsz)


if __name__ == "__main__":
    main()
