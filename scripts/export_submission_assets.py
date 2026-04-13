from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
from reportlab.lib import colors
from reportlab.lib.pagesizes import landscape, letter
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas


REPO_ROOT = Path(__file__).resolve().parents[1]
DOCS_DIR = REPO_ROOT / "docs"
ML_DIR = REPO_ROOT / "ml" / "artifacts"
LOGO_PATH = REPO_ROOT / "docs" / "slidev" / "logo.png"
ARCH_PDF = DOCS_DIR / "architecture-diagram-final.pdf"
ARCH_PNG = DOCS_DIR / "architecture-diagram-final.png"
MODEL_CARD_PDF = DOCS_DIR / "model-card-final.pdf"


def main() -> None:
    metrics = json.loads((ML_DIR / "route_decay_metrics.json").read_text(encoding="utf-8"))
    model = json.loads((ML_DIR / "route_decay_model.json").read_text(encoding="utf-8"))
    export_architecture_pdf()
    export_architecture_png()
    export_model_card_pdf(metrics, model)
    print(f"Wrote {ARCH_PDF}")
    print(f"Wrote {ARCH_PNG}")
    print(f"Wrote {MODEL_CARD_PDF}")


def export_architecture_pdf() -> None:
    page_w, page_h = landscape(letter)
    c = canvas.Canvas(str(ARCH_PDF), pagesize=(page_w, page_h))
    draw_architecture(c, page_w, page_h)
    c.save()


def export_architecture_png() -> None:
    width, height = 1800, 1080
    image = Image.new("RGBA", (width, height), "#f4f8fc")
    draw = ImageDraw.Draw(image)
    title_font = ImageFont.truetype("arialbd.ttf", 46)
    subtitle_font = ImageFont.truetype("arial.ttf", 24)
    box_title_font = ImageFont.truetype("arialbd.ttf", 26)
    body_font = ImageFont.truetype("arial.ttf", 20)

    draw_gradient_background(draw, width, height)
    paste_logo(image, 72, 56, 108)
    draw.text((204, 64), "Huntrix Delta Architecture", fill="#102033", font=title_font)
    draw.text((206, 118), "Digital Delta submission export • AP design for offline disaster response", fill="#44606f", font=subtitle_font)

    groups = architecture_groups()
    for group in groups:
        rounded_box(draw, group["frame"], fill=group["fill"], outline=group["outline"], radius=28, width=3)
        draw.text((group["frame"][0] + 24, group["frame"][1] + 18), group["title"], fill="#102033", font=box_title_font)
        y = group["frame"][1] + 64
        for line in group["lines"]:
            rounded_box(draw, (group["frame"][0] + 20, y, group["frame"][2] - 20, y + 54), fill="#ffffff", outline="#d7e2ea", radius=18, width=2)
            draw.text((group["frame"][0] + 36, y + 16), line, fill="#324855", font=body_font)
            y += 64

    for arrow in architecture_arrows():
        draw_arrow(draw, arrow[0], arrow[1], arrow[2], arrow[3], arrow[4])

    rounded_box(draw, (72, 930, 1728, 1016), fill="#e7f5fb", outline="#8bc9df", radius=26, width=2)
    draw.text((98, 952), "CAP choice: AP (Availability + Partition Tolerance). Nodes continue operating while partitioned and reconcile later via CRDT merge rules.", fill="#113247", font=body_font)
    image.convert("RGB").save(ARCH_PNG)


def export_model_card_pdf(metrics: dict, model: dict) -> None:
    page_w, page_h = letter
    c = canvas.Canvas(str(MODEL_CARD_PDF), pagesize=(page_w, page_h))
    draw_model_card(c, page_w, page_h, metrics, model)
    c.save()


def draw_architecture(c: canvas.Canvas, page_w: float, page_h: float) -> None:
    draw_pdf_background(c, page_w, page_h)
    draw_pdf_logo(c, 42, page_h - 112, 72)
    c.setFillColor(colors.HexColor("#102033"))
    c.setFont("Helvetica-Bold", 24)
    c.drawString(126, page_h - 62, "Huntrix Delta Architecture")
    c.setFillColor(colors.HexColor("#44606f"))
    c.setFont("Helvetica", 12)
    c.drawString(128, page_h - 82, "Digital Delta submission export • AP design for offline disaster response")

    for group in architecture_groups(pdf=True):
        rounded_pdf_box(c, *group["frame"], fill=group["fill"], stroke=group["outline"], radius=14, line_width=1.5)
        c.setFillColor(colors.HexColor("#102033"))
        c.setFont("Helvetica-Bold", 13)
        c.drawString(group["frame"][0] + 14, group["frame"][3] - 24, group["title"])
        y = group["frame"][3] - 54
        for line in group["lines"]:
            rounded_pdf_box(c, group["frame"][0] + 14, y - 4, group["frame"][2] - group["frame"][0] - 28, 26, fill="#ffffff", stroke="#d7e2ea", radius=8, line_width=1)
            c.setFillColor(colors.HexColor("#324855"))
            c.setFont("Helvetica", 10)
            c.drawString(group["frame"][0] + 24, y + 4, line)
            y -= 34

    for arrow in architecture_arrows(pdf=True):
        draw_pdf_arrow(c, *arrow)

    rounded_pdf_box(c, 36, 32, page_w - 72, 44, fill="#e7f5fb", stroke="#8bc9df", radius=12, line_width=1)
    c.setFillColor(colors.HexColor("#113247"))
    c.setFont("Helvetica", 10)
    c.drawString(50, 50, "CAP choice: AP (Availability + Partition Tolerance). Nodes continue operating while partitioned and reconcile later via CRDT merge rules.")


def draw_model_card(c: canvas.Canvas, page_w: float, page_h: float, metrics: dict, model: dict) -> None:
    draw_pdf_background(c, page_w, page_h)
    draw_pdf_logo(c, 36, page_h - 88, 58)
    c.setFillColor(colors.HexColor("#102033"))
    c.setFont("Helvetica-Bold", 22)
    c.drawString(108, page_h - 50, "Route Decay Model Card")
    c.setFillColor(colors.HexColor("#486270"))
    c.setFont("Helvetica", 10)
    c.drawString(110, page_h - 68, "HackFusion 2026 • M7 Predictive Route Decay • One-page submission export")

    rounded_pdf_box(c, 36, page_h - 160, page_w - 72, 62, fill="#0f2430", stroke="#1e5168", radius=16, line_width=1.2)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 12)
    c.drawString(54, page_h - 126, "Model")
    c.setFont("Helvetica", 10)
    c.drawString(110, page_h - 126, "Logistic regression • 2h impassability prediction • On-device JS inference in Expo")
    c.setFont("Helvetica-Bold", 12)
    c.drawString(54, page_h - 144, "Metrics")
    c.setFont("Helvetica", 10)
    c.drawString(110, page_h - 144, f"Precision {metrics['precision']} • Recall {metrics['recall']} • F1 {metrics['f1']} • Threshold {metrics['threshold']}")

    # Methodology flow
    c.setFillColor(colors.HexColor("#102033"))
    c.setFont("Helvetica-Bold", 12)
    c.drawString(36, page_h - 188, "Methodology")
    flow_y = page_h - 282
    steps = [
        ("1. Sensor feed", "1 Hz rainfall feed + edge context"),
        ("2. Features", "cumulative rain, rate change, elevation, soil proxy"),
        ("3. Training", "80/20 split + standardization + logistic regression"),
        ("4. Runtime", "JSON coefficients mirrored to backend and mobile"),
    ]
    x_positions = [36, 188, 360, 532]
    colors_fill = ["#e7f5fb", "#fdf0d6", "#e8f3ea", "#f5e8fa"]
    colors_stroke = ["#8bc9df", "#e4b86c", "#9dc9b1", "#c89de0"]
    for idx, (title, body) in enumerate(steps):
        rounded_pdf_box(c, x_positions[idx], flow_y, 128, 70, fill=colors_fill[idx], stroke=colors_stroke[idx], radius=14, line_width=1)
        c.setFillColor(colors.HexColor("#102033"))
        c.setFont("Helvetica-Bold", 10)
        c.drawString(x_positions[idx] + 10, flow_y + 46, title)
        c.setFont("Helvetica", 8)
        c.drawString(x_positions[idx] + 10, flow_y + 26, body)
        if idx < len(steps) - 1:
            draw_pdf_arrow(c, x_positions[idx] + 128, flow_y + 35, x_positions[idx + 1] - 12, flow_y + 35, "#1e5168")

    # Left column details
    rounded_pdf_box(c, 36, page_h - 520, 286, 178, fill="#ffffff", stroke="#d8e2e8", radius=14, line_width=1)
    c.setFillColor(colors.HexColor("#102033"))
    c.setFont("Helvetica-Bold", 12)
    c.drawString(52, page_h - 366, "Dataset + Features")
    c.setFont("Helvetica", 9)
    dataset_lines = [
        "Sensor feed: ml/training/rainfall_sensor_feed.csv",
        "Training table: ml/training/route_decay_training.csv",
        "Scenario graph: data/sylhet_map.json",
        "Environment: data/edge_environment_context.json",
        "",
        "Features:",
        *[f"• {feature}" for feature in model["features"]],
    ]
    y = page_h - 384
    for line in dataset_lines:
        c.drawString(52, y, line)
        y -= 14

    rounded_pdf_box(c, 338, page_h - 520, 238, 178, fill="#ffffff", stroke="#d8e2e8", radius=14, line_width=1)
    c.setFillColor(colors.HexColor("#102033"))
    c.setFont("Helvetica-Bold", 12)
    c.drawString(354, page_h - 366, "Confusion Summary")
    c.setFont("Helvetica", 9)
    confusion = [
        ("TP", str(metrics["tp"]), "#dff0e7"),
        ("FP", str(metrics["fp"]), "#f8dede"),
        ("TN", str(metrics["tn"]), "#e7f5fb"),
        ("FN", str(metrics["fn"]), "#fdf0d6"),
    ]
    box_x = 354
    box_y = page_h - 424
    for idx, (label, value, fill) in enumerate(confusion):
        x = box_x + (idx % 2) * 104
        y = box_y - (idx // 2) * 56
        rounded_pdf_box(c, x, y, 90, 42, fill=fill, stroke="#d8e2e8", radius=10, line_width=1)
        c.setFillColor(colors.HexColor("#102033"))
        c.setFont("Helvetica-Bold", 11)
        c.drawString(x + 12, y + 24, f"{label}: {value}")

    rounded_pdf_box(c, 592, page_h - 520, 184, 178, fill="#ffffff", stroke="#d8e2e8", radius=14, line_width=1)
    c.setFillColor(colors.HexColor("#102033"))
    c.setFont("Helvetica-Bold", 12)
    c.drawString(608, page_h - 366, "Risks + Notes")
    c.setFont("Helvetica", 9)
    risk_lines = [
        "• Labels are synthetic, not field-observed.",
        "• Random row split may inflate evaluation quality.",
        "• Mobile artifact must stay in sync after retraining.",
        "• Threshold tuning is static in this prototype.",
    ]
    y = page_h - 390
    for line in risk_lines:
        c.drawString(608, y, line)
        y -= 18

    rounded_pdf_box(c, 36, 44, page_w - 72, 72, fill="#f3f8fb", stroke="#d8e2e8", radius=14, line_width=1)
    c.setFillColor(colors.HexColor("#102033"))
    c.setFont("Helvetica-Bold", 11)
    c.drawString(52, 96, "Runtime integration")
    c.setFont("Helvetica", 9)
    c.drawString(52, 80, "High-risk edges above 0.7 are penalized in the routing graph before route plans are served.")
    c.drawString(52, 66, "The backend and the Expo app both consume the same exported coefficient artifact family.")


def architecture_groups(pdf: bool = False):
    if pdf:
        return [
            {"title": "Expo Mobile Node", "frame": (42, 330, 204, 540), "fill": "#e7f5fb", "outline": "#89c7df", "lines": ["Auth + OTP", "CRDT Store", "PoD QR", "Wi-Fi Direct Peer Sync", "Mesh Relay Demo", "On-Device Risk Inference"]},
            {"title": "Go Core", "frame": (286, 330, 458, 540), "fill": "#fdf0d6", "outline": "#e4b86c", "lines": ["HTTP API", "gRPC API", "Routing Engine", "Predictive Penalty Engine", "Triage Engine", "Fleet / Handoff Engine"]},
            {"title": "Contracts + Data", "frame": (536, 356, 686, 540), "fill": "#e8f3ea", "outline": "#9dc9b1", "lines": ["Proto Contracts", "Sylhet Scenario Data", "ML Artifacts"]},
            {"title": "Simulation", "frame": (536, 232, 686, 336), "fill": "#f5e8fa", "outline": "#c89de0", "lines": ["Chaos Simulator"]},
            {"title": "Route Deck", "frame": (536, 108, 686, 212), "fill": "#fbe9df", "outline": "#dca388", "lines": ["Vite + React + Leaflet"]},
        ]
    return [
        {"title": "Expo Mobile Node", "frame": (72, 220, 470, 710), "fill": "#e7f5fb", "outline": "#89c7df", "lines": ["Auth + OTP", "CRDT Store", "PoD QR", "Wi-Fi Direct Peer Sync", "Mesh Relay Demo", "On-Device Risk Inference"]},
        {"title": "Go Core", "frame": (612, 220, 1050, 710), "fill": "#fdf0d6", "outline": "#e4b86c", "lines": ["HTTP API", "gRPC API", "Routing Engine", "Predictive Penalty Engine", "Triage Engine", "Fleet / Handoff Engine"]},
        {"title": "Contracts + Data", "frame": (1210, 260, 1700, 710), "fill": "#e8f3ea", "outline": "#9dc9b1", "lines": ["Proto Contracts", "Sylhet Scenario Data", "ML Artifacts"]},
        {"title": "Simulation", "frame": (1210, 90, 1700, 230), "fill": "#f5e8fa", "outline": "#c89de0", "lines": ["Chaos Simulator"]},
        {"title": "Route Deck", "frame": (1210, 760, 1700, 900), "fill": "#fbe9df", "outline": "#dca388", "lines": ["Vite + React + Leaflet"]},
    ]


def architecture_arrows(pdf: bool = False):
    if pdf:
        return [
            (246, 476, 286, 476, "#1e5168"),
            (458, 476, 536, 476, "#1e5168"),
            (612, 330, 612, 232, "#7b4f95"),
            (612, 330, 612, 212, "#c96b33"),
        ]
    return [
        (470, 465, 612, 465, "#1e5168"),
        (1050, 465, 1210, 465, "#1e5168"),
        (1455, 230, 1455, 260, "#7b4f95"),
        (1455, 710, 1455, 760, "#c96b33"),
    ]


def draw_pdf_background(c: canvas.Canvas, page_w: float, page_h: float) -> None:
    c.setFillColor(colors.HexColor("#f4f8fc"))
    c.rect(0, 0, page_w, page_h, stroke=0, fill=1)
    c.setFillColor(colors.HexColor("#e8f4fb"))
    c.circle(40, page_h - 20, 90, stroke=0, fill=1)
    c.setFillColor(colors.HexColor("#fbf1dc"))
    c.circle(page_w - 10, page_h - 10, 90, stroke=0, fill=1)


def draw_gradient_background(draw: ImageDraw.ImageDraw, width: int, height: int) -> None:
    draw.rectangle((0, 0, width, height), fill="#f4f8fc")
    draw.ellipse((-80, -60, 420, 320), fill="#e8f4fb")
    draw.ellipse((width - 420, -60, width + 100, 320), fill="#fbf1dc")


def draw_pdf_logo(c: canvas.Canvas, x: float, y: float, size: float) -> None:
    if LOGO_PATH.exists():
        c.drawImage(ImageReader(str(LOGO_PATH)), x, y, width=size, height=size, mask='auto')


def paste_logo(image: Image.Image, x: int, y: int, size: int) -> None:
    if LOGO_PATH.exists():
        logo = Image.open(LOGO_PATH).convert("RGBA").resize((size, size))
        image.alpha_composite(logo, (x, y))


def rounded_pdf_box(c: canvas.Canvas, x: float, y: float, width: float, height: float, fill: str, stroke: str, radius: float, line_width: float) -> None:
    c.setFillColor(colors.HexColor(fill))
    c.setStrokeColor(colors.HexColor(stroke))
    c.setLineWidth(line_width)
    c.roundRect(x, y, width, height, radius, stroke=1, fill=1)


def rounded_box(draw: ImageDraw.ImageDraw, frame, fill: str, outline: str, radius: int, width: int) -> None:
    draw.rounded_rectangle(frame, radius=radius, fill=fill, outline=outline, width=width)


def draw_pdf_arrow(c: canvas.Canvas, x1: float, y1: float, x2: float, y2: float, color: str) -> None:
    c.setStrokeColor(colors.HexColor(color))
    c.setFillColor(colors.HexColor(color))
    c.setLineWidth(2)
    c.line(x1, y1, x2, y2)
    c.line(x2, y2, x2 - 8, y2 + 5)
    c.line(x2, y2, x2 - 8, y2 - 5)


def draw_arrow(draw: ImageDraw.ImageDraw, x1: int, y1: int, x2: int, y2: int, color: str) -> None:
    draw.line((x1, y1, x2, y2), fill=color, width=6)
    draw.polygon([(x2, y2), (x2 - 18, y2 - 10), (x2 - 18, y2 + 10)], fill=color)


if __name__ == "__main__":
    main()
