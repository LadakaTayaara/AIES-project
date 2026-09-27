from ultralytics import YOLO

def export_to_onnx(weights_path: str = "model/weights/yolov8_pothole/weights/best.pt"):
    """
    Export trained YOLOv8 model to ONNX format for mobile deployment.
    The exported model can be loaded by ONNX Runtime Mobile in React Native.
    """
    model = YOLO(weights_path)

    model.export(
        format="onnx",
        imgsz=640,
        simplify=True,      # simplify ONNX graph for mobile
        opset=12,           # ONNX opset compatible with mobile runtime
        dynamic=False
    )

    print("ONNX export complete. File saved alongside weights.")
    print("Copy the .onnx file to mobile/assets/models/ for React Native integration.")


if __name__ == "__main__":
    export_to_onnx()
