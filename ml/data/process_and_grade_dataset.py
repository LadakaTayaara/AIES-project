"""
Dataset Extraction and Automated Severity Grading Pipeline
===========================================================
This script:
1. Extracts the Roboflow Pothole dataset from raw_dataset/Pothole.v1-raw.yolov11.zip.
2. Applies ASTM D6433 Pavement Condition Index (PCI) severity classification:
   - Class 0 (minor):    Area < 1.2% of frame (shallow spalling, pitting < 30 cm)
   - Class 1 (moderate): 1.2% <= Area < 5.5% (medium pothole 30-60 cm)
   - Class 2 (severe):   Area >= 5.5% (deep cratering > 60 cm, structural failure)
3. Outputs standard YOLO format dataset to ml/data/yolo_dataset/ (train, val, test).
4. Outputs standard COCO JSON format dataset to ml/data/coco_dataset/ (train, valid, test) for RF-DETR.
"""

import os
import sys
import json
import shutil
import zipfile
from pathlib import Path
from PIL import Image

# ── Paths ─────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent
RAW_ZIP = BASE_DIR / "raw_dataset" / "Pothole.v1-raw.yolov11.zip"
YOLO_DIR = BASE_DIR / "yolo_dataset"
COCO_DIR = BASE_DIR / "coco_dataset"

CLASS_NAMES = ["minor", "moderate", "severe"]

# ASTM Area Ratio thresholds (bounding box width * height normalized to [0, 1])
THRESH_MINOR = 0.012     # < 1.2%
THRESH_MODERATE = 0.055  # 1.2% - 5.5%, >= 5.5% is severe


def compute_severity(w: float, h: float) -> int:
    """Classify pothole severity based on normalized bounding box area."""
    area = w * h
    if area < THRESH_MINOR:
        return 0  # minor
    elif area < THRESH_MODERATE:
        return 1  # moderate
    else:
        return 2  # severe


def process_dataset():
    if not RAW_ZIP.exists():
        print(f"Error: Raw zip not found at {RAW_ZIP}")
        sys.exit(1)

    print("=" * 60)
    print("  AUTOMATED DATASET EXTRACTION & SEVERITY GRADING")
    print(f"  Source: {RAW_ZIP.name}")
    print(f"  Target YOLO: {YOLO_DIR}")
    print(f"  Target COCO: {COCO_DIR}")
    print("=" * 60)

    # Clean previous output dirs if any
    if YOLO_DIR.exists():
        shutil.rmtree(YOLO_DIR)
    if COCO_DIR.exists():
        shutil.rmtree(COCO_DIR)

    # Create directories
    for split in ["train", "val", "test"]:
        (YOLO_DIR / "images" / split).mkdir(parents=True, exist_ok=True)
        (YOLO_DIR / "labels" / split).mkdir(parents=True, exist_ok=True)

    split_map = {
        "train": "train",
        "valid": "val",
        "test": "test"
    }

    coco_split_map = {
        "train": "train",
        "val": "valid",
        "test": "test"
    }

    stats = {0: 0, 1: 0, 2: 0}
    total_images = 0
    total_boxes = 0

    with zipfile.ZipFile(RAW_ZIP, "r") as z:
        namelist = z.namelist()

        for raw_split, target_split in split_map.items():
            img_prefix = f"{raw_split}/images/"
            lbl_prefix = f"{raw_split}/labels/"

            img_files = [n for n in namelist if n.startswith(img_prefix) and n.lower().endswith((".jpg", ".jpeg", ".png"))]
            print(f"\nProcessing {raw_split} -> {target_split} ({len(img_files)} images)...")

            for img_name in img_files:
                base_filename = Path(img_name).name
                stem = Path(img_name).stem
                lbl_name = f"{lbl_prefix}{stem}.txt"

                # Read image bytes & save to YOLO dir
                img_data = z.read(img_name)
                dest_img_path = YOLO_DIR / "images" / target_split / base_filename
                with open(dest_img_path, "wb") as f:
                    f.write(img_data)

                # Process labels
                dest_lbl_path = YOLO_DIR / "labels" / target_split / f"{stem}.txt"
                new_label_lines = []

                if lbl_name in namelist:
                    lbl_content = z.read(lbl_name).decode("utf-8", errors="ignore")
                    for line in lbl_content.splitlines():
                        parts = line.strip().split()
                        if len(parts) >= 5:
                            # format: cls cx cy w h
                            cx, cy, w, h = map(float, parts[1:5])
                            sev_class = compute_severity(w, h)
                            stats[sev_class] += 1
                            total_boxes += 1
                            new_label_lines.append(f"{sev_class} {cx:.6f} {cy:.6f} {w:.6f} {h:.6f}")

                with open(dest_lbl_path, "w") as f:
                    f.write("\n".join(new_label_lines) + ("\n" if new_label_lines else ""))

                total_images += 1

    print("\n" + "=" * 60)
    print("  EXTRACTION & GRADING COMPLETED")
    print(f"  Total Images Processed: {total_images}")
    print(f"  Total Bounding Boxes:   {total_boxes}")
    print("  Class Distribution:")
    for cid, cname in enumerate(CLASS_NAMES):
        count = stats[cid]
        pct = (count / max(total_boxes, 1)) * 100
        print(f"    Class {cid} ({cname:8s}): {count:5d} ({pct:5.1f}%)")
    print("=" * 60)

    # ── Convert to COCO JSON format for RF-DETR ────────────────────────
    print("\nGenerating COCO JSON Annotations for RF-DETR...")
    for yolo_split, coco_split in coco_split_map.items():
        images_dir = YOLO_DIR / "images" / yolo_split
        labels_dir = YOLO_DIR / "labels" / yolo_split
        out_coco_dir = COCO_DIR / coco_split
        out_coco_dir.mkdir(parents=True, exist_ok=True)

        coco = {
            "images": [],
            "annotations": [],
            "categories": [{"id": i, "name": name} for i, name in enumerate(CLASS_NAMES)]
        }

        ann_id = 1
        img_files = sorted(images_dir.glob("*"))
        img_files = [f for f in img_files if f.suffix.lower() in (".jpg", ".jpeg", ".png")]

        for img_id, img_path in enumerate(img_files, start=1):
            dst = out_coco_dir / img_path.name
            if not dst.exists():
                shutil.copy2(img_path, dst)

            try:
                with Image.open(img_path) as im:
                    w_px, h_px = im.size
            except Exception:
                continue

            coco["images"].append({
                "id": img_id,
                "file_name": img_path.name,
                "width": w_px,
                "height": h_px
            })

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

                    x = (cx - bw / 2.0) * w_px
                    y = (cy - bh / 2.0) * h_px
                    box_w = bw * w_px
                    box_h = bh * h_px

                    coco["annotations"].append({
                        "id": ann_id,
                        "image_id": img_id,
                        "category_id": cls_id,
                        "bbox": [round(x, 2), round(y, 2), round(box_w, 2), round(box_h, 2)],
                        "area": round(box_w * box_h, 2),
                        "iscrowd": 0
                    })
                    ann_id += 1

        ann_path = out_coco_dir / "_annotations.coco.json"
        with open(ann_path, "w") as f:
            json.dump(coco, f, indent=2)

        print(f"  [OK] {coco_split}: {len(coco['images'])} images, {len(coco['annotations'])} annotations -> {ann_path.name}")

    print("\n[OK] Both YOLO and COCO datasets are prepared successfully!")


if __name__ == "__main__":
    process_dataset()
