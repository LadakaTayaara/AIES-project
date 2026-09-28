# 🕳️ Hole Lotta Problems

> **An AI-powered crowdsourced pothole detection and civic accountability platform — built on AMD ROCm**

![Python](https://img.shields.io/badge/Python-3.10+-blue?style=flat-square&logo=python)
![PyTorch](https://img.shields.io/badge/PyTorch-2.x-orange?style=flat-square&logo=pytorch)
![AMD ROCm](https://img.shields.io/badge/AMD-ROCm-red?style=flat-square)
![RF-DETR](https://img.shields.io/badge/RF--DETR-Roboflow-purple?style=flat-square)
![FastAPI](https://img.shields.io/badge/FastAPI-0.109+-green?style=flat-square&logo=fastapi)
![License](https://img.shields.io/badge/License-MIT-lightgrey?style=flat-square)

---

## 🚦 The Problem

Every day, millions of people navigate roads riddled with potholes. This leads to severe vehicle damage, increased risk of accidents, and countless complaints that often go unnoticed or unresolved. 

Municipalities typically react only when the public pressure becomes unbearable, or worse, after severe accidents occur. **There is no intelligent, automated system that continuously detects road damage, prioritizes it by severity, and proactively tells authorities exactly where to act — before it becomes a crisis.**

---

## 💡 Our Solution

**Hole Lotta Problems** is an intelligent, end-to-end **Urban Road Intelligence Platform** designed to revolutionize civic maintenance. By empowering citizens to easily report issues and equipping municipalities with AI-driven insights, our platform bridges the gap between road damage and repair.

### 🌟 Key Features

- 📸 **AI Detection:** Detects potholes from user-uploaded photos with high accuracy using a fine-tuned **RF-DETR** (Detection Transformer) model — significantly more accurate than YOLO-based approaches.
- 🌐 **Web Dashboard:** Modern, interactive web dashboard with real-time map visualization, report submission, and analytics — accessible from any browser.
- 📱 **Mobile App:** React Native (Expo) app with camera-based scanning and GPS tagging for field reports.
- 📍 **Interactive Mapping:** Visualizes road damage in real-time via GPS-tagged map markers with severity color-coding using Leaflet.js.
- 🧠 **Smart Clustering:** Processes and clusters text reports using sentence embeddings + DBSCAN to identify hotspot areas.
- 📊 **Road Health Index:** Dynamic scoring system that calculates city-wide road health from severity-weighted report data.
- 🐦 **Automated Escalation:** Twitter bot that publicly tags municipalities for hotspots that remain unresolved past a configurable threshold.
- 💾 **Full Persistence:** All reports stored in SQLite with annotated images, detection metadata, and status tracking.

---

## 🏗️ Architecture & Tech Stack

![Architecture Diagram](docs/architecture_diagram.png)

### Technologies Used

| Category | Technologies |
|---|---|
| **AI/ML** | RF-DETR (Roboflow Detection Transformer), Sentence Transformers (`all-MiniLM-L6-v2`), Groq / LLaMA 3 |
| **Backend API** | FastAPI, SQLite + SQLAlchemy, Supervision & Pillow for CV annotation |
| **Web Dashboard** | Vanilla JS + CSS3, Leaflet.js + Esri Dark Canvas GIS, Technical Minimalism Design System |
| **Mobile App** | React Native (Expo SDK 57), Leaflet via WebView (Keyless GIS), CameraView |
| **Civic Bot Integration**| Tweepy (Twitter/X API v2), APScheduler |
| **AMD ROCm Ecosystem** | ROCm 5.7+, MIOpen, MIVisionX, rocJPEG, rocDecode, RCCL |

### Hardware Acceleration Map
| Layer | Component | AMD ROCm Library |
|---|---|---|
| Image Decoding | rocJPEG + rocDecode | `rocJPEG`, `rocDecode` |
| CV Pipeline | RF-DETR + MIVisionX | `MIVisionX`, `MIOpen` |
| LLM Inference | LLaMA 8B (via Groq / ROCm) | `MIOpen`, `RCCL` |

---

## 🔬 Machine Learning, Computer Vision & Algorithmic Architecture

Hole Lotta Problems relies on an integrated pipeline combining computer vision, spatial clustering, and semantic NLP algorithms to process raw citizen telemetry into prioritized civic repair work orders.

```
                    ┌───────────────────────────────────────────────┐
                    │          Citizen Mobile / Web Upload          │
                    │         (RGB Image + GPS Coordinates)         │
                    └───────────────────────┬───────────────────────┘
                                            │
                                            ▼
                    ┌───────────────────────────────────────────────┐
                    │         RF-DETR Inference Engine              │
                    │   • Deformable Multi-Scale Attention          │
                    │   • Bipartite Hungarian Object Matching       │
                    │   • 3-Class Severity Classification Head      │
                    └───────────────────────┬───────────────────────┘
                                            │
                     ┌──────────────────────┴──────────────────────┐
                     ▼                                             ▼
       ┌───────────────────────────┐                 ┌───────────────────────────┐
       │   Annotated Output Buffer │                 │   Structured Meta Payload │
       │  (Supervision / Pillow)   │                 │ (Class, Conf, BBox, Lat/Lng)│
       └───────────────────────────┘                 └─────────────┬─────────────┘
                                                                   │
                                                                   ▼
                                                     ┌───────────────────────────┐
                                                     │    Persistence Layer      │
                                                     │    (SQLite / SQLAlchemy)  │
                                                     └─────────────┬─────────────┘
                                                                   │
                 ┌─────────────────────────────────────────────────┴─────────────────────────────────────────────────┐
                 ▼                                                                                                   ▼
   ┌───────────────────────────┐                                                                       ┌───────────────────────────┐
   │ Spatial Grid Clustering   │                                                                       │ Semantic NLP Deduplication│
   │ • 2D Spatial Binning      │                                                                       │ • all-MiniLM-L6-v2 Embed  │
   │ • Severity Weighted Score │                                                                       │ • DBSCAN Cosine Metric    │
   │ • Road Health Index (RHI) │                                                                       │ • Groq LLaMA-3 Generation │
   └───────────────────────────┘                                                                       └───────────────────────────┘
```

---

### 1. Computer Vision: RF-DETR (Detection Transformer)

Traditional pothole detection architectures heavily rely on YOLO models (YOLOv5/v8). However, YOLO architectures exhibit well-documented failure modes when handling road surface damage:
- **Heuristic Non-Maximum Suppression (NMS) Breakdown:** When multiple overlapping asphalt crevices or clustered potholes occur, NMS often suppresses valid adjoining detections.
- **Scale and Texture Variance:** Potholes lack rigid geometric boundaries, blending subtly into weathered asphalt or shadows.

To overcome these constraints, this platform implements **RF-DETR** (Roboflow Detection Transformer), adapting end-to-end transformer-based object detection:

#### A. Architecture Overview
- **Hybrid Feature Extractor:** A multi-scale visual backbone extracts deep feature pyramids ($P_3, P_4, P_5$) capturing high-resolution pavement textures as well as broad road context.
- **Deformable Cross-Attention:** Unlike standard global attention which scales quadratically ($O(N^2)$), deformable attention queries only a small set of key sampling points around reference points, providing high inference speed with transformer-grade accuracy.
- **Learned Object Queries:** Fixed sets of learned query embeddings interact with image feature representations through stacked transformer decoder layers.
- **Direct Set Prediction:** Eliminates anchor boxes and NMS post-processing entirely through global 1-to-1 bipartite matching.

#### B. Loss Formulation & Hungarian Matching
During training, RF-DETR computes an optimal bipartite assignment between the set of $N$ predictions $\hat{y} = \{\hat{y}_i\}_{i=1}^N$ and ground-truth road distress objects $y$ via the **Hungarian algorithm**:

$$\hat{\sigma} = \arg\min_{\sigma \in \mathfrak{S}_N} \sum_{i=1}^N \mathcal{L}_{\text{match}}(y_i, \hat{y}_{\sigma(i)})$$

Where the matching cost $\mathcal{L}_{\text{match}}$ balances classification probability with spatial box accuracy:

$$\mathcal{L}_{\text{match}}(y_i, \hat{y}_{\sigma(i)}) = -\mathbf{1}_{\{c_i \neq \varnothing\}} \hat{p}_{\sigma(i)}(c_i) + \mathbf{1}_{\{c_i \neq \varnothing\}} \left[ \lambda_{\text{box}} \|b_i - \hat{b}_{\sigma(i)}\|_1 + \lambda_{\text{giou}} \mathcal{L}_{\text{giou}}(b_i, \hat{b}_{\sigma(i)}) \right]$$

Once matched, the Hungarian loss function optimizes bounding box spatial overlap via Generalized IoU ($\mathcal{L}_{\text{giou}}$), scale-invariant L1 loss, and focal cross-entropy loss ($\mathcal{L}_{\text{cls}}$):

$$\mathcal{L}_{\text{Hungarian}}(y, \hat{y}) = \sum_{i=1}^N \left[ \mathcal{L}_{\text{cls}}(c_i, \hat{p}_{\hat{\sigma}(i)}) + \mathbf{1}_{\{c_i \neq \varnothing\}} \left( \lambda_{\text{box}} \|b_i - \hat{b}_{\hat{\sigma}(i)}\|_1 + \lambda_{\text{giou}} \mathcal{L}_{\text{giou}}(b_i, \hat{b}_{\hat{\sigma}(i)}) \right) \right]$$

---

### 2. Detection & Severity Identification Pipeline

The detection service (`backend/services/detection.py`) executes an asynchronous inference pipeline with dual-mode operational resilience:

```
                          ┌───────────────────────────┐
                          │   Incoming Image Stream   │
                          └─────────────┬─────────────┘
                                        │
                                        ▼
                          ┌───────────────────────────┐
                          │   PIL Conversion to RGB   │
                          │   Disk Cache to /uploads  │
                          └─────────────┬─────────────┘
                                        │
                                        ▼
                          ┌───────────────────────────┐
                          │     Load RF-DETR Model    │
                          │  (Fine-Tuned or Pre-Trained)│
                          └─────────────┬─────────────┘
                                        │
                                        ▼
                       [Is Fine-Tuned Weights Active?]
                                     / \
                           YES     /     \     NO (Base / Zero-Shot)
                                 /         \
                                ▼           ▼
                   ┌──────────────────┐   ┌───────────────────────────┐
                   │  Direct 3-Class  │   │  Dynamic Geometric        │
                   │  Head Mapping    │   │  Area-Ratio Estimator     │
                   │ (Minor/Mod/Sev)  │   │  AreaRatio = BBox / Image │
                   └────────┬─────────┘   └─────────────┬─────────────┘
                            │                           │
                            └─────────────┬─────────────┘
                                          │
                                          ▼
                          ┌───────────────────────────┐
                          │   Confidence Filter       │
                          │  (Threshold >= 0.35)      │
                          └─────────────┬─────────────┘
                                        │
                                        ▼
                          ┌───────────────────────────┐
                          │   Visual Annotation Pass  │
                          │  (Supervision Box+Label)  │
                          │   Save to /annotated      │
                          └───────────────────────────┘
```

#### A. Direct Severity Mapping (Fine-Tuned Weights)
When trained weights (`best_checkpoint.pth`) are available, the detection head directly maps model output class indices to severity levels:
- `Class 0`: **Minor** — Surface pitting or shallow depressions non-threatening to vehicular alignment.
- `Class 1`: **Moderate** — Intermediate potholes creating moderate impact on tires, dangerous to two-wheelers.
- `Class 2`: **Severe** — Deep, cratered structural asphalt failures requiring immediate municipal intervention.

#### B. Dynamic Geometric Estimator (Fallback / Zero-Shot Mode)
When operating with base pre-trained weights without domain-specific heads, the system activates a **spatial area-ratio heuristic algorithm**:

$$\text{AreaRatio} = \frac{(x_2 - x_1) \times (y_2 - y_1)}{W_{\text{image}} \times H_{\text{image}}}$$

$$\text{Severity}(\text{bbox}, \text{conf}) = \begin{cases} 
\text{Severe}, & \text{if } \text{AreaRatio} > 0.08 \lor \text{conf} > 0.85 \\
\text{Moderate}, & \text{if } \text{AreaRatio} > 0.03 \lor \text{conf} > 0.60 \\
\text{Minor}, & \text{otherwise}
\end{cases}$$

---

### 3. Spatial Intelligence & Hotspot Clustering Algorithm

Raw GPS reports are aggregated in real time to calculate municipal hotspots and the dynamic **Road Health Index (RHI)** (`backend/api/heatmap.py`).

#### A. 2D Discrete Grid Binning
Rather than computing $O(N^2)$ pairwise geodetic distances across all historical points, the system executes discrete 2D spatial binning:

$$\text{grid\_lat} = \text{round}\left(\frac{\text{lat}}{\Delta}\right) \times \Delta, \quad \text{grid\_lng} = \text{round}\left(\frac{\text{lng}}{\Delta}\right) \times \Delta$$

Where $\Delta = 0.002^\circ \approx 200\,\text{meters}$. Reports falling into identical spatial grid coordinates form a cluster $C_k$.

#### B. Severity-Weighted Hazard Scoring
Each cluster is assigned a cumulative damage score based on the severity distribution of its constituent reports:

$$\text{Score}(C_k) = \sum_{r \in C_k} w(\text{severity}_r), \quad \text{where } w = \begin{cases} 5, & \text{severe} \\ 3, & \text{moderate} \\ 1, & \text{minor} \end{cases}$$

Clusters are ranked descending by $\text{Score}(C_k)$ to generate the municipal repair queue.

#### C. Road Health Index (RHI) Formulation
The city-wide road network is represented as a real-time scalar index bounded between $0$ (catastrophic deterioration) and $100$ (optimal road surface):

$$\text{RHI} = \max\left(0, \; 100 - \left[ \frac{\sum_{r \in \mathcal{R}_{\text{unresolved}}} w(\text{severity}_r)}{\text{MaxScore}_{\text{cap}}} \right] \times 100 \right)$$

Where $\text{MaxScore}_{\text{cap}} = 500$ (calibrated to $100$ critical reports).

---

### 4. Semantic NLP & Text Deduplication Pipeline

In addition to image telemetry, the platform analyzes unstructured citizen descriptions (`backend/services/clustering.py`).

#### A. Dense Vector Embeddings
Citizen reports are passed through **`all-MiniLM-L6-v2`** (a 6-layer Sentence Transformer distilled from BERT) mapping natural language statements into a 384-dimensional dense metric space:

$$\mathbf{e}_i = \text{Encoder}(T_i) \in \mathbb{R}^{384}, \quad \|\mathbf{e}_i\|_2 = 1$$

#### B. DBSCAN Density-Based Clustering
To discover semantic clusters without specifying cluster counts *a priori*, the system runs **DBSCAN** using cosine distance:

$$d(\mathbf{e}_i, \mathbf{e}_j) = 1 - \frac{\mathbf{e}_i \cdot \mathbf{e}_j}{\|\mathbf{e}_i\| \|\mathbf{e}_j\|} = 1 - \mathbf{e}_i \cdot \mathbf{e}_j \quad (\text{for normalized embeddings})$$

$$\text{Parameters: } \varepsilon = 0.30, \quad \text{MinSamples} = 2$$

Points with cosine similarity $\ge 0.70$ are connected into cohesive complaints, effectively deduplicating multiple citizen complaints filed for the same road depression.

#### C. LLM Civic Escalation Agent
Clusters that cross severity and persistence thresholds are dispatched to an automated civic escalation agent powered by **LLaMA 3 (via Groq)**. Using zero-shot prompts with structured JSON outputs, the model synthesizes factual municipal accountability notices tagged with exact coordinates and urgency ratings.

---

### 5. Hardware Acceleration via AMD ROCm

The system is optimized for deployment on AMD hardware architectures through ROCm:
- **`rocJPEG` / `rocDecode`:** Zero-copy hardware image decoding directly into GPU VRAM, bypassing host-to-device PCIe bottlenecks during batch ingestion.
- **`MIOpen`:** Deep learning primitive acceleration for convolution kernels, normalization layers, and multi-head attention operations in RF-DETR.
- **`MIVisionX`:** Computer vision optimization framework for accelerated image preprocessing and bounding-box geometry pipelines.

---

## 📂 Project Structure

```text
hole-lotta-problems/
├── backend/
│   ├── main.py                 # FastAPI app + static file serving
│   ├── database.py             # SQLite database models & session management
│   ├── api/
│   │   ├── reports.py          # Report CRUD (submit, query, update, delete)
│   │   ├── heatmap.py          # Map data, hotspot clustering, Road Health Index
│   │   ├── dashboard.py        # Analytics, priority lists, timeline stats
│   │   └── health.py           # API + model + DB health check
│   ├── services/
│   │   ├── detection.py        # RF-DETR inference with annotated image output
│   │   └── clustering.py       # Text clustering + LLM tweet generation
│   ├── utils/
│   │   └── config.py           # App configuration (env vars, model paths)
│   ├── static/                 # Web dashboard (HTML/CSS/JS)
│   ├── uploads/                # User-uploaded images (auto-created)
│   └── annotated/              # AI-annotated result images (auto-created)
├── frontend/                   # React Native (Expo) mobile app
├── ml/
│   ├── model/
│   │   ├── train/train.py      # RF-DETR fine-tuning script
│   │   ├── inference/          # ONNX export utilities
│   │   └── weights/            # Trained model checkpoints
│   └── data/                   # Dataset configs + conversion scripts
├── bot/
│   └── twitter_bot.py          # Automated Twitter escalation bot
├── requirements.txt            # Python dependencies
├── run_project.bat             # One-click startup (Windows)
└── README.md
```

---

## 🚀 Getting Started

### 📋 Prerequisites

- **Python 3.10+**
- **Node.js 18+** & **npm** (for mobile app)
- **Expo Go** app on your phone (for mobile testing)
- **CUDA 11.8+** / **AMD ROCm 5.7+** (optional, for GPU inference)

### 🛠️ 1. Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/hole-lotta-problems.git
cd hole-lotta-problems

# Set up Python virtual environment
python -m venv venv
venv\Scripts\activate       # Windows
# source venv/bin/activate  # macOS/Linux

# Install dependencies
pip install -r requirements.txt
```

### 🏃 2. Running the Project

#### ⚡ Method A: One-Click Startup (Windows)

```cmd
.\run_project.bat
```

This starts both the **FastAPI backend** (port 8000) and the **Expo mobile app** in separate terminal windows.

#### ⚡ Method B: Manual Startup

**Start the Backend (serves both API and web dashboard):**
```bash
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

**Open the web dashboard:**
- Navigate to `http://localhost:8000` in your browser

**Start the mobile app (optional):**
```bash
cd frontend
npm install
npx expo start
```

### 🧠 3. Training the RF-DETR Model

To get the best detection accuracy, fine-tune RF-DETR on the pothole dataset:

```bash
cd ml/model/train
python train.py
```

This will:
1. Automatically convert the YOLO-format dataset to COCO format
2. Fine-tune RF-DETR Base on the pothole severity classes (minor, moderate, severe)
3. Save the best checkpoint to `ml/model/weights/rfdetr_pothole/`

The backend will automatically pick up the trained weights on next startup.

### 📱 4. Mobile App

1. Ensure your phone and PC are on the **same Wi-Fi network**
2. Open **Expo Go** on your phone
3. Scan the QR code from the Expo terminal
4. The app auto-detects the backend IP address

---

## 📡 API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/` | GET | Web dashboard |
| `/api/health` | GET | Health check (API + model + DB status) |
| `/api/reports/submit` | POST | Submit pothole report (image + GPS) |
| `/api/reports/all` | GET | List all reports (filterable, paginated) |
| `/api/reports/{id}` | GET | Get single report details |
| `/api/reports/{id}/status` | PATCH | Update report status |
| `/api/reports/nearby` | GET | Find reports near coordinates |
| `/api/heatmap/data` | GET | Map marker data |
| `/api/heatmap/hotspots` | GET | Clustered hotspot rankings |
| `/api/heatmap/road-health-index` | GET | Road Health Index score |
| `/api/dashboard/summary` | GET | Full dashboard analytics |
| `/api/dashboard/priority-list` | GET | Severity-ranked repair queue |
| `/api/dashboard/stats/timeline` | GET | Daily report timeline |

Full interactive API docs available at `http://localhost:8000/docs`

---

## ⚙️ Environment Variables

Create a `.env` file in the project root:

```env
# RF-DETR Model
RFDETR_WEIGHTS_PATH=ml/model/weights/rfdetr_pothole/best_checkpoint.pth
CONFIDENCE_THRESHOLD=0.35

# Groq API (for LLM text features)
GROQ_API_KEY=your_groq_api_key

# Twitter Bot (for automated escalation)
TWITTER_API_KEY=your_api_key
TWITTER_API_SECRET=your_api_secret
TWITTER_ACCESS_TOKEN=your_access_token
TWITTER_ACCESS_SECRET=your_access_secret
```

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
