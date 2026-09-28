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
| **AI/ML** | RF-DETR (Roboflow Detection Transformer) for CV, Sentence Transformers for NLP, Groq/LLaMA for text generation |
| **Backend API** | FastAPI, SQLite + SQLAlchemy (zero-config persistence), Supervision (annotation) |
| **Web Dashboard** | Vanilla JS + CSS, Leaflet.js + CartoDB dark tiles, Glassmorphism UI |
| **Mobile App** | React Native (Expo), react-native-maps |
| **Bot Integration** | Tweepy (Twitter API), APScheduler |
| **AMD ROCm Ecosystem** | ROCm, MIOpen, MIVisionX, rocJPEG, rocDecode, RCCL |

### Hardware Acceleration Map
| Layer | Component | AMD ROCm Library |
|---|---|---|
| Image Decoding | rocJPEG + rocDecode | `rocJPEG`, `rocDecode` |
| CV Pipeline | RF-DETR + MIVisionX | `MIVisionX`, `MIOpen` |
| LLM Inference | LLaMA 8B (via Groq) | `MIOpen`, `RCCL` |

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
