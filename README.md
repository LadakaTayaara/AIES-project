# 🕳️ Hole Lotta Problems

> **An AI-powered crowdsourced pothole detection and civic accountability platform — built on AMD ROCm**

![Python](https://img.shields.io/badge/Python-3.10+-blue?style=flat-square&logo=python)
![PyTorch](https://img.shields.io/badge/PyTorch-2.x-orange?style=flat-square&logo=pytorch)
![AMD ROCm](https://img.shields.io/badge/AMD-ROCm-red?style=flat-square)
![YOLOv8](https://img.shields.io/badge/YOLOv8-Ultralytics-purple?style=flat-square)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green?style=flat-square&logo=fastapi)
![License](https://img.shields.io/badge/License-MIT-lightgrey?style=flat-square)

---

## 🚦 The Problem

Every day, millions of people navigate roads riddled with potholes. This leads to severe vehicle damage, increased risk of accidents, and countless complaints that often go unnoticed or unresolved. 

Municipalities typically react only when the public pressure becomes unbearable, or worse, after severe accidents occur. **There is no intelligent, automated system that continuously detects road damage, prioritizes it by severity, and proactively tells authorities exactly where to act — before it becomes a crisis.**

---

## 💡 Our Solution

**Hole Lotta Problems** is an intelligent, end-to-end **Urban Road Intelligence Platform** designed to revolutionize civic maintenance. By empowering citizens to easily report issues and equipping municipalities with AI-driven insights, our platform bridges the gap between road damage and repair.

### 🌟 Key Features

- 📸 **AI Detection:** Detects potholes from user-uploaded photos accurately using a fine-tuned **YOLOv8** computer vision model.
- 📍 **Interactive Mapping:** Visualizes road damage in real-time via high-performance, GPS-tagged 3D heatmaps.
- 🧠 **Smart Clustering:** Processes and clusters text reports using the **LLaMA 7B** language model to extract significant hotspots and repetitive complaints.
- 📊 **Dynamic Scoring:** Calculates and scores road health city-wide through a dynamic **Road Health Index**, helping prioritize severe issues.
- 🐦 **Automated Escalation:** Triggers an automated Twitter (X) bot that publicly tags respective municipalities for hotspots that remain unresolved over a set period.

---

## 🏗️ Architecture & Tech Stack

![Architecture Diagram](docs/architecture_diagram.png)

### Technologies Used

| Category | Technologies |
|---|---|
| **AI/ML** | YOLOv8 (Ultralytics) for CV, LLaMA 7B (4-bit quantized) for NLP, Sentence Transformers, ONNX Runtime |
| **Backend API** | FastAPI, PostgreSQL + PostGIS (geospatial), Firebase (real-time sync), Celery + Redis |
| **Mobile App (Frontend)** | React Native (Expo), deck.gl + OpenStreetMap for GPU-accelerated heatmaps |
| **Bot Integration** | Tweepy (Twitter API integration) |
| **AMD ROCm Ecosystem** | ROCm, MIOpen, MIVisionX, rocJPEG, rocDecode, RCCL |

### Hardware Acceleration map
| Layer | Component | AMD ROCm Library |
|---|---|---|
| Image Decoding | rocJPEG + rocDecode | `rocJPEG`, `rocDecode` |
| CV Pipeline | YOLOv8 + MIVisionX | `MIVisionX`, `MIOpen` |
| LLM Inference | LLaMA 7B | `MIOpen`, `RCCL` |

---

## 📂 Project Structure

```text
hole-lotta-problems/
├── backend/            # FastAPI REST API, database models, and ML inference routes
├── frontend/           # React Native (Expo) mobile application
├── ml/                 # YOLOv8 models, datasets, training scripts, and runs
├── bot/                # Twitter bot scripts for automated escalation
├── scripts/            # Utility scripts (testing, deps, generators)
├── docs/               # Architecture diagrams and other assets
├── .env.example        # Example environment variables file
├── run_project.bat     # One-click startup script for Windows
└── README.md           # Project documentation
```

---

## 🚀 Getting Started & Usage Instructions

Follow the instructions below to get the project up and running on your local machine.

### 📋 Prerequisites

Ensure you have the following installed on your system before proceeding:
- **Python 3.10+**
- **Node.js 18+** & **npm**
- **Expo Go** app installed on your iOS or Android mobile device.
- **PostgreSQL** (with **PostGIS** extension enabled).
- **Redis** server running locally.
- **CUDA 11.8+** (for local development with NVIDIA) OR **AMD ROCm 5.7+** (for AMD deployment).

### 🛠️ 1. Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/hole-lotta-problems.git
   cd hole-lotta-problems
   ```

2. **Set up the Python Virtual Environment:**
   ```bash
   python -m venv venv
   
   # On Windows:
   venv\Scripts\activate
   
   # On macOS/Linux:
   source venv/bin/activate
   ```

3. **Install Backend Dependencies:**
   ```bash
   pip install -r requirements.txt
   ```
   *(Note: For specific backend libraries, you can also check `requirements_backend.txt`)*

4. **Environment Variables:**
   Create a `.env` file in the root directory by copying the example file:
   ```bash
   cp .env.example .env
   ```
   *Open the `.env` file and populate it with your actual Database URL, Firebase keys, Twitter API credentials, and other required keys.*

### 🏃 2. Running the Project

#### ⚡ Method A: One-Click Startup (Recommended for Windows)

If you are on Windows, you can start both the **FastAPI Backend** and the **React Native Frontend** simultaneously using the provided batch script.

1. Double-click on `run_project.bat` in the root folder, or run it from the terminal:
   ```cmd
   .\run_project.bat
   ```
2. The script will automatically open two new command prompt windows:
   - One running the FastAPI server on `http://0.0.0.0:8000`.
   - One running the Expo development server, which will automatically install frontend dependencies (if not already installed) and display a **QR Code**.

#### ⚡ Method B: Manual Startup

If you prefer to start the services manually or are on macOS/Linux:

**Start the Backend:**
```bash
# Ensure your virtual environment is activated
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
*The API will be available at `http://localhost:8000`. You can test the endpoints at `http://localhost:8000/docs`.*

**Start the Mobile Frontend:**
Open a separate terminal window:
```bash
cd frontend
npm install   # Run this only the first time to install dependencies
npx expo start
```

### 📱 3. Connecting the Mobile App

To test the React Native application on your physical device:
1. Ensure your laptop/PC and your mobile phone are connected to the **SAME Wi-Fi network**.
2. Open the **Expo Go** app on your phone.
3. Scan the **QR Code** that appeared in your frontend terminal.
4. The app will bundle and load on your device. It will automatically connect to your locally running FastAPI backend (ensure the backend is running on `0.0.0.0`).

---

## ⚙️ Environment Variables Reference

A quick guide to the `.env` configuration:

```env
# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/holalotta

# Firebase (for real-time features)
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_PROJECT_ID=your_firebase_project_id

# Twitter Bot (for municipal escalations)
TWITTER_API_KEY=your_api_key
TWITTER_API_SECRET=your_api_secret
TWITTER_ACCESS_TOKEN=your_access_token
TWITTER_ACCESS_SECRET=your_access_secret

# AI/LLM API Keys
GROQ_API_KEY=your_groq_api_key  # Fallback for LLaMA processing

# CV Model Settings
MODEL_PATH=ml/model/weights/yolov8_pothole/weights/best.pt
DEVICE=cuda  # Change to 'rocm' for AMD GPU deployment or 'cpu'
```

---

## 👥 Meet the Team

**Hole Lotta Problems** was proudly built as an AMD Slingshot Project.

| Name | Role |
|------|------|
| **Aviraj Sinha** | Backend Architecture, Mobile App (React Native) |
| **Abhinandan Singh** | Backend Integration, CV Model Training, AMD ROCm |
| **Abhinav Bisht** | Frontend Design, Pitch Presentation, Product Strategy |

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for deeper details.
