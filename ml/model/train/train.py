from ultralytics import YOLO
import torch
import os

def train():
    print(f"Training on: {'CUDA' if torch.cuda.is_available() else 'CPU'}")
    print(f"GPU: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'None'}")

    model = YOLO("yolov8n.pt")  # using yolov8n for faster training

    # Get the ml/ root folder dynamically (since this script is in ml/model/train)
    ml_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    
    project_path = os.path.join(ml_dir, "model", "weights")
    data_path = os.path.join(ml_dir, "data", "pothole_dataset.yaml")

    results = model.train(
        data=data_path,
        epochs=125,
        imgsz=640,
        batch=16,
        device=0,  # Force GPU usage
        project=project_path,
        name="yolov8_pothole",
        exist_ok=True,
        patience=25,           # early stopping
        augment=True, #equivalent of transformations in pytorch
        verbose=True
    )

    print(f"Training complete. Weights saved to: model/weights/yolov8_pothole/weights/best.pt")


if __name__ == "__main__":
    train()
