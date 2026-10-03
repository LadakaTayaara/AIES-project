"""
Research Paper Evaluation & Benchmarking Suite
===============================================
Computes official detection metrics (mAP@50, mAP@50-95, Precision, Recall, F1)
on the test dataset, generates side-by-side comparative tables against the base
paper (Kumari et al., IEEE 2023), and exports publication-ready LaTeX tables
for your research paper submission.
"""

import os
import sys
from pathlib import Path
import pandas as pd
from ultralytics import YOLO

# ── Paths ─────────────────────────────────────────────────────────────
ML_DIR = Path(__file__).resolve().parent.parent
DATA_YAML = ML_DIR / "data" / "pothole_dataset.yaml"
OUTPUT_DIR = ML_DIR / "benchmark_results"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# ── Base Paper (Kumari et al., IEEE 2023) Reported Benchmarks ─────────
# "YOLOv8 based Deep Learning Method for Potholes Detection"
# Table II: Performance of Different YOLOv8 Variants
BASE_PAPER_BENCHMARKS = [
    {"Model": "YOLOv8n (Kumari et al. 2023)", "mAP50": 0.782, "mAP50-95": 0.456, "Precision": 0.814, "Recall": 0.727, "Severity Grading": "No (1-class)"},
    {"Model": "YOLOv8s (Kumari et al. 2023)", "mAP50": 0.727, "mAP50-95": 0.491, "Precision": 0.814, "Recall": 0.727, "Severity Grading": "No (1-class)"},
    {"Model": "YOLOv8m (Kumari et al. 2023)", "mAP50": 0.787, "mAP50-95": 0.495, "Precision": 0.814, "Recall": 0.727, "Severity Grading": "No (1-class)"},
    {"Model": "YOLOv8l (Kumari et al. 2023)", "mAP50": 0.787, "mAP50-95": 0.502, "Precision": 0.832, "Recall": 0.730, "Severity Grading": "No (1-class)"},
    {"Model": "YOLOv8x (Kumari et al. 2023)", "mAP50": 0.785, "mAP50-95": 0.514, "Precision": 0.826, "Recall": 0.730, "Severity Grading": "No (1-class)"},
]

CLASS_NAMES = ["minor", "moderate", "severe"]


def evaluate_model(weights_path: str, model_label: str = "Our Proposed Model", split: str = "test"):
    """
    Run validation on the test split and extract paper metrics.
    """
    if not os.path.exists(weights_path):
        print(f"Error: Weights file not found: {weights_path}")
        return None

    print("\n" + "=" * 75)
    print(f"  EVALUATING MODEL: {model_label}")
    print(f"  Weights: {weights_path}")
    print(f"  Split:   {split}")
    print("=" * 75)

    model = YOLO(weights_path)
    metrics = model.val(
        data=str(DATA_YAML),
        split=split,
        device="0",
        verbose=True,
        save_json=False,
        plots=True
    )

    # Overall metrics
    overall_p = float(metrics.box.mp)
    overall_r = float(metrics.box.mr)
    overall_map50 = float(metrics.box.map50)
    overall_map50_95 = float(metrics.box.map)
    f1_score = 2 * (overall_p * overall_r) / max(overall_p + overall_r, 1e-6)

    print("\n>>> OVERALL TEST RESULTS <<<")
    print(f"  mAP@0.50:       {overall_map50*100:.2f}%")
    print(f"  mAP@0.50:0.95:  {overall_map50_95*100:.2f}%")
    print(f"  Precision:      {overall_p*100:.2f}%")
    print(f"  Recall:         {overall_r*100:.2f}%")
    print(f"  F1-Score:       {f1_score*100:.2f}%")

    # Per-class metrics
    class_metrics = []
    print("\n>>> PER-CLASS BREAKDOWN <<<")
    for i, cname in enumerate(CLASS_NAMES):
        cp = float(metrics.box.p[i]) if hasattr(metrics.box, 'p') and len(metrics.box.p) > i else 0.0
        cr = float(metrics.box.r[i]) if hasattr(metrics.box, 'r') and len(metrics.box.r) > i else 0.0
        cmap50 = float(metrics.box.maps[i]) if len(metrics.box.maps) > i else 0.0
        cf1 = 2 * (cp * cr) / max(cp + cr, 1e-6)
        class_metrics.append({
            "Class": cname.capitalize(),
            "Precision": cp,
            "Recall": cr,
            "mAP@50": cmap50,
            "F1-Score": cf1
        })
        print(f"  {cname.capitalize():10s} | Precision: {cp*100:5.2f}% | Recall: {cr*100:5.2f}% | mAP@50: {cmap50*100:5.2f}% | F1: {cf1*100:5.2f}%")

    # ── Single-Class (Binary Pothole) Evaluation for Direct Baseline Comparison ──
    print("\nRunning Single-Class (Binary) Evaluation for direct baseline comparison...")
    metrics_binary = model.val(
        data=str(DATA_YAML),
        split=split,
        device="0",
        verbose=False,
        save_json=False,
        single_cls=True,
        plots=False
    )
    bin_map50 = float(metrics_binary.box.map50)
    bin_map50_95 = float(metrics_binary.box.map)
    bin_p = float(metrics_binary.box.mp)
    bin_r = float(metrics_binary.box.mr)

    # ── Generate Comparative Table ──────────────────────────────────────
    comp_rows = list(BASE_PAPER_BENCHMARKS)
    comp_rows.append({
        "Model": f"{model_label} (Binary Pothole)",
        "mAP50": bin_map50,
        "mAP50-95": bin_map50_95,
        "Precision": bin_p,
        "Recall": bin_r,
        "Severity Grading": "No (Apples-to-Apples)",
    })
    comp_rows.append({
        "Model": f"{model_label} (3-Class Severity)",
        "mAP50": overall_map50,
        "mAP50-95": overall_map50_95,
        "Precision": overall_p,
        "Recall": overall_r,
        "Severity Grading": "Yes (3-Class ASTM)",
    })

    df_comp = pd.DataFrame(comp_rows)
    df_comp["mAP50 (%)"] = (df_comp["mAP50"] * 100).round(2)
    df_comp["mAP50-95 (%)"] = (df_comp["mAP50-95"] * 100).round(2)
    df_comp["Precision (%)"] = (df_comp["Precision"] * 100).round(2)
    df_comp["Recall (%)"] = (df_comp["Recall"] * 100).round(2)

    disp_cols = ["Model", "mAP50 (%)", "mAP50-95 (%)", "Precision (%)", "Recall (%)", "Severity Grading"]
    df_display = df_comp[disp_cols]

    print("\n" + "=" * 75)
    print("  RESEARCH PAPER COMPARATIVE BENCHMARK")
    print("=" * 75)
    print(df_display.to_string(index=False))

    # ── Export LaTeX Code for Paper ─────────────────────────────────────
    latex_file = OUTPUT_DIR / "paper_comparison_table.tex"
    with open(latex_file, "w") as f:
        f.write("% --- LaTeX Table: Direct Comparison with Base Paper (Kumari et al., IEEE 2023) ---\n")
        f.write("\\begin{table*}[t]\n")
        f.write("\\centering\n")
        f.write("\\caption{Performance Comparison with Baseline Road Pothole Detection Models}\n")
        f.write("\\label{tab:pothole_comparison}\n")
        f.write("\\begin{tabular}{lcccccc}\n")
        f.write("\\hline\n")
        f.write("\\textbf{Model / Study} & \\textbf{mAP@0.5 (\\%)} & \\textbf{mAP@0.5:0.95 (\\%)} & \\textbf{Precision (\\%)} & \\textbf{Recall (\\%)} & \\textbf{Severity Grading} \\\\\n")
        f.write("\\hline\n")
        for _, row in df_display.iterrows():
            is_ours = "Binary" in row["Model"] or "3-Class" in row["Model"]
            prefix = "\\textbf{" if is_ours else ""
            suffix = "}" if is_ours else ""
            f.write(f"{prefix}{row['Model']}{suffix} & {prefix}{row['mAP50 (%)']:.2f}{suffix} & {prefix}{row['mAP50-95 (%)']:.2f}{suffix} & {prefix}{row['Precision (%)']:.2f}{suffix} & {prefix}{row['Recall (%)']:.2f}{suffix} & {prefix}{row['Severity Grading']}{suffix} \\\\\n")
        f.write("\\hline\n")
        f.write("\\end{tabular}\n")
        f.write("\\end{table*}\n")

    # ── Export Per-Class LaTeX Table ────────────────────────────────────
    latex_class_file = OUTPUT_DIR / "paper_per_class_table.tex"
    df_class = pd.DataFrame(class_metrics)
    with open(latex_class_file, "w") as f:
        f.write("% --- LaTeX Table: Per-Class Pothole Severity Metrics ---\n")
        f.write("\\begin{table}[h]\n")
        f.write("\\centering\n")
        f.write("\\caption{Per-Class Severity Detection Performance}\n")
        f.write("\\label{tab:per_class_severity}\n")
        f.write("\\begin{tabular}{lcccc}\n")
        f.write("\\hline\n")
        f.write("\\textbf{Severity Level} & \\textbf{Precision (\\%)} & \\textbf{Recall (\\%)} & \\textbf{mAP@0.5 (\\%)} & \\textbf{F1-Score (\\%)} \\\\\n")
        f.write("\\hline\n")
        for _, row in df_class.iterrows():
            f.write(f"{row['Class']} & {row['Precision']*100:.2f} & {row['Recall']*100:.2f} & {row['mAP@50']*100:.2f} & {row['F1-Score']*100:.2f} \\\\\n")
        f.write("\\hline\n")
        f.write(f"\\textbf{{Overall / Mean}} & \\textbf{{{overall_p*100:.2f}}} & \\textbf{{{overall_r*100:.2f}}} & \\textbf{{{overall_map50*100:.2f}}} & \\textbf{{{f1_score*100:.2f}}} \\\\\n")
        f.write("\\hline\n")
        f.write("\\end{tabular}\n")
        f.write("\\end{table}\n")

    # Export CSVs
    csv_file = OUTPUT_DIR / "comparison_metrics.csv"
    df_display.to_csv(csv_file, index=False)
    df_class.to_csv(OUTPUT_DIR / "per_class_metrics.csv", index=False)

    print("\n" + "=" * 75)
    print("  ARTIFACTS GENERATED SUCCESSFULLY")
    print(f"  LaTeX Table 1 (Paper comparison): {latex_file}")
    print(f"  LaTeX Table 2 (Per-class breakdown): {latex_class_file}")
    print(f"  CSV Metrics Table:                 {csv_file}")
    print("=" * 75)

    return {
        "mAP50": overall_map50,
        "mAP50-95": overall_map50_95,
        "Precision": overall_p,
        "Recall": overall_r,
        "F1": f1_score,
        "latex_comparison": str(latex_file),
        "latex_per_class": str(latex_class_file),
    }


if __name__ == "__main__":
    weights = sys.argv[1] if len(sys.argv) > 1 else "ml/model/weights/yolov8_pothole/weights/best.pt"
    label = sys.argv[2] if len(sys.argv) > 2 else "YOLOv8 Severity Model"
    evaluate_model(weights, label)
