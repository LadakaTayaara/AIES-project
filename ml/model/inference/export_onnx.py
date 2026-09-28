"""
Export RF-DETR model to ONNX format for deployment.

The exported model can be used with ONNX Runtime for faster inference
on edge devices or in production environments without PyTorch.

Usage:
    python export_onnx.py [--weights path/to/checkpoint.pth]
"""

import argparse
import sys
from pathlib import Path


def export_to_onnx(weights_path: str, output_path: str = None):
    """
    Export trained RF-DETR model to ONNX format.
    """
    try:
        from rfdetr import RFDETRBase
    except ImportError:
        print("✕ rfdetr not installed. Run: pip install rfdetr")
        sys.exit(1)

    if not Path(weights_path).exists():
        print(f"✕ Weights not found at: {weights_path}")
        print("  Train the model first using: python ml/model/train/train.py")
        sys.exit(1)

    print(f"Loading model from: {weights_path}")
    model = RFDETRBase(pretrain_weights=weights_path)

    if output_path is None:
        output_path = str(Path(weights_path).parent / "rfdetr_pothole.onnx")

    out_target = Path(output_path).resolve()
    out_dir = str(out_target.parent)
    out_stem = out_target.stem

    try:
        import inspect
        import shutil
        import torch

        # RF-DETR models can be exported via built-in export or torch.onnx
        print(f"Exporting to ONNX: {out_target}")

        # Use the model's built-in export if available
        if hasattr(model, 'export'):
            sig = inspect.signature(model.export)
            export_kwargs = {"format": "onnx"}
            if "output_path" in sig.parameters:
                export_kwargs["output_path"] = str(out_target)
            else:
                if "output_dir" in sig.parameters:
                    export_kwargs["output_dir"] = out_dir
                if "output_name" in sig.parameters:
                    export_kwargs["output_name"] = out_stem

            exported_path = model.export(**export_kwargs)
            if exported_path and Path(exported_path).exists() and Path(exported_path).resolve() != out_target:
                shutil.move(str(exported_path), str(out_target))
        else:
            # Manual export via PyTorch
            dummy_input = torch.randn(1, 3, 560, 560)
            if hasattr(model, 'model'):
                torch.onnx.export(
                    model.model,
                    dummy_input,
                    str(out_target),
                    opset_version=16,
                    input_names=["image"],
                    output_names=["detections"],
                    dynamic_axes={
                        "image": {0: "batch_size"},
                        "detections": {0: "batch_size"},
                    },
                )

        print(f"✓ ONNX export complete: {out_target}")

    except Exception as e:
        print(f"✕ ONNX export failed: {e}")
        print("  This may require specific rfdetr version support.")
        sys.exit(1)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Export RF-DETR to ONNX")
    parser.add_argument(
        "--weights",
        default="../../model/weights/rfdetr_pothole/best_checkpoint.pth",
        help="Path to trained RF-DETR checkpoint",
    )
    parser.add_argument(
        "--output",
        default=None,
        help="Output ONNX file path",
    )
    args = parser.parse_args()

    export_to_onnx(args.weights, args.output)
