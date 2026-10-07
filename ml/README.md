# 🧠 Machine Learning Subsystem: RF-DETR Road Hazard Intelligence

This directory contains the training pipelines, dataset converters, model checkpoints, and inference utilities for the **Hole Lotta Problems** computer vision engine.

---

## 🎯 Model Architecture: RF-DETR Base

The core vision model is **RF-DETR** (Roboflow Detection Transformer), an end-to-end transformer-based object detection framework tailored for small-to-medium scale surface defects.

### Key Architectural Advantages
- **Elimination of Anchor Boxes & NMS:** Unlike YOLO models that rely on manual IOU thresholds for Non-Maximum Suppression (often failing when potholes cluster together), RF-DETR models object detection as a direct set prediction problem.
- **Global Context via Deformable Cross-Attention:** Learns spatial dependencies across differing asphalt textures, crack networks, wet pavements, and variable lighting angles.
- **Bipartite Hungarian Matching:** Evaluates global matching cost between candidate queries and ground truth annotations, preventing duplicate or redundant boundary predictions.

---

## 📊 Dataset Specification & Conversion

The dataset originates from annotated pavement hazard imagery categorized across three hazard severity tiers.

### Class Definitions

| Class ID | Class Label | Visual Characteristics | Civic Threat Level |
|---|---|---|---|
| `0` | **minor** | Shallow surface pitting, peeling asphalt, minor spalling (< 30 cm diameter, shallow depth) | Low threat to vehicular tires; advisory monitoring |
| `1` | **moderate** | Intermediate potholes with exposed sub-base (30–60 cm diameter, 3–7 cm depth) | Tire pinch risk, rim denting, hazard to two-wheelers |
| `2` | **severe** | Deep cratering, sharp asphalt edges, structural base failure (> 60 cm diameter, > 7 cm depth) | Severe suspension damage, high rollover/accident probability |

### Automated YOLO → COCO Conversion Pipeline

RF-DETR consumes datasets in standard **COCO JSON format** (`_annotations.coco.json`). The training harness in `ml/model/train/train.py` automatically converts raw YOLO normalized coordinates into COCO absolute pixel coordinates:

```python
# Conversion formulation:
# Input: cx, cy, bw, bh (normalized to [0, 1])
# Output: x_min, y_min, width, height (absolute pixels)
x = (cx - bw / 2) * image_width
y = (cy - bh / 2) * image_height
box_w = bw * image_width
box_h = bh * image_height
```

Directory Structure:
```text
ml/data/
├── yolo_dataset/                # Source YOLO dataset
│   ├── images/
│   │   ├── train/
│   │   └── val/
│   └── labels/
│       ├── train/
│       └── val/
└── coco_dataset/                # Generated COCO dataset
    ├── train/
    │   ├── _annotations.coco.json
    │   └── [images...]
    └── valid/
        ├── _annotations.coco.json
        └── [images...]
```

---

## 🏋️ Training Protocol & Hyperparameters

To fine-tune RF-DETR on the pothole dataset:

```bash
cd ml/model/train
python train.py
```

### Configured Hyperparameters (`train.py`)

| Parameter | Value | Justification |
|---|---|---|
| **Base Weights** | `RFDETRBase()` (COCO Pre-trained) | Warm-starts feature extraction with general semantic edge priors |
| **Epochs** | `80` | Sufficient convergence for small-to-medium defect distributions |
| **Batch Size** | `4` | Accommodates GPU VRAM limitations during multi-scale attention |
| **Grad Accumulation Steps** | `4` | Effectively simulates an optimal batch size of `16` ($4 \times 4$) |
| **Learning Rate** | `1e-4` | Stable fine-tuning without catastrophic forgetting of visual backbone |
| **Num Classes** | `3` (`minor`, `moderate`, `severe`) | Direct classification head without post-hoc heuristic thresholds |
| **Output Directory** | `ml/model/weights/rfdetr_pothole/` | Best checkpoints are automatically parsed by the FastAPI backend |

---

## ⚡ Inference Pipeline & Fallback Chain

The inference service (`backend/services/detection.py`) guarantees continuous operational readiness through a multi-tier fallback:

```
                  ┌──────────────────────────────────────────────┐
                  │          Query: Incoming Image Path          │
                  └──────────────────────┬───────────────────────┘
                                         │
                                         ▼
                        [Does Fine-Tuned Checkpoint Exist?]
                                      /     \
                            YES      /       \      NO
                                    /         \
                                   ▼           ▼
                      ┌─────────────────┐    ┌─────────────────┐
                      │  Fine-Tuned     │    │  Pre-trained    │
                      │  RF-DETR Head   │    │  Base RF-DETR   │
                      └────────┬────────┘    └────────┬────────┘
                               │                      │
                               ▼                      ▼
                     Categorical Mapping    Area-Ratio Heuristic
                     (Classes 0, 1, 2)     (AreaRatio > 0.08 → Severe)
                               │                      │
                               └──────────┬───────────┘
                                          │
                                          ▼
                      ┌────────────────────────────────────────┐
                      │ Supervision Visual Overlay Buffer      │
                      │ Bounding Boxes + Confidence + Severity │
                      └────────────────────────────────────────┘
```

---

## 🚀 Hardware Acceleration & AMD ROCm Support

For production inference:
- **AMD ROCm / MIOpen** for native AMD Radeon / Instinct GPU tensor processing
- **rocJPEG** hardware-accelerated decode for instant ingestion of multi-megapixel mobile frames

---

## 🏆 Research Benchmarks & Base Paper Comparison (Kumari et al., IEEE 2023)

The vision models are formally evaluated against Kumari et al. (IEEE 2023). For the full empirical report, LaTeX tables, and PR curves:
- See the main repository [README.md](../README.md) or [`docs/RESEARCH_PAPER_METRICS.md`](../docs/RESEARCH_PAPER_METRICS.md)
- Comparative table and per-class CSV metrics: [`ml/benchmark_results/`](./benchmark_results)
- Benchmark evaluation suite: [`ml/model/evaluate_benchmark.py`](./model/evaluate_benchmark.py)

| Model | mAP@0.5 (%) | mAP@0.5:0.95 (%) | Precision (%) | Recall (%) | Severity Head |
|---|:---:|:---:|:---:|:---:|:---:|
| **Kumari et al. Best (YOLOv8l/m)** | 78.70 | 50.20 | 83.20 | 73.00 | None (1-class) |
| **Proposed Binary Baseline** | **79.12** 🏆 | **48.95** | **78.78** | **72.33** | None (Direct Comparison) |
| **Proposed 3-Class Severity** | **73.16** | **45.80** | **80.04** | **64.51** | **ASTM D6433 3-Tier** |
| ↳ *Severe Craters Only* | **84.90** | — | **76.39** | **86.79** | Critical Safety Class |

