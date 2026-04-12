"""Unit detection service using color-based segmentation and template matching.

CoC units have distinctive visual signatures:
- Super Yeti: large, blue-white body
- Heroes (King/Queen/Warden/Champion): distinct color auras
- Spells: circular colored effects on the ground

This PoC uses HSV color ranges to detect candidate regions,
then classifies them by size and color profile.
Template matching is supported when reference images are provided.
"""

from pathlib import Path

import cv2
import numpy as np

TEMPLATES_DIR = Path(__file__).parent.parent / "templates"

# HSV color ranges for unit/spell categories
# Format: (lower_hsv, upper_hsv)
COLOR_PROFILES: dict[str, list[tuple[np.ndarray, np.ndarray]]] = {
    "hero_king": [
        # Blue/purple glow (Barbarian King aura)
        (np.array([100, 80, 80]), np.array([130, 255, 255])),
    ],
    "hero_queen": [
        # Pink/magenta glow (Archer Queen aura)
        (np.array([140, 80, 80]), np.array([170, 255, 255])),
    ],
    "hero_warden": [
        # White/light blue glow (Grand Warden aura)
        (np.array([85, 30, 180]), np.array([105, 120, 255])),
    ],
    "spell_rage": [
        # Purple/violet circle (Rage spell)
        (np.array([130, 60, 100]), np.array([160, 255, 255])),
    ],
    "spell_freeze": [
        # Cyan/light blue circle (Freeze spell)
        (np.array([80, 80, 150]), np.array([100, 255, 255])),
    ],
    "troops_general": [
        # Bright colored units against dark battlefield
        (np.array([0, 100, 120]), np.array([20, 255, 255])),   # Red/orange units
        (np.array([20, 100, 120]), np.array([35, 255, 255])),  # Yellow units
    ],
}

# Minimum contour area to count as a detection (filters noise)
MIN_CONTOUR_AREA = 200
# Maximum contour area (filters out large background regions)
MAX_CONTOUR_AREA = 50000


def detect_units_by_color(img: np.ndarray) -> list[dict]:
    """Detect unit candidates using HSV color segmentation."""
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    detections: list[dict] = []

    for category, ranges in COLOR_PROFILES.items():
        combined_mask = np.zeros(hsv.shape[:2], dtype=np.uint8)
        for lower, upper in ranges:
            mask = cv2.inRange(hsv, lower, upper)
            combined_mask = cv2.bitwise_or(combined_mask, mask)

        # Morphological cleanup
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        combined_mask = cv2.morphologyEx(combined_mask, cv2.MORPH_CLOSE, kernel)
        combined_mask = cv2.morphologyEx(combined_mask, cv2.MORPH_OPEN, kernel)

        contours, _ = cv2.findContours(
            combined_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )

        for contour in contours:
            area = cv2.contourArea(contour)
            if area < MIN_CONTOUR_AREA or area > MAX_CONTOUR_AREA:
                continue

            x, y, w, h = cv2.boundingRect(contour)
            cx, cy = x + w // 2, y + h // 2

            detections.append({
                "category": category,
                "bbox": [x, y, w, h],
                "center": [cx, cy],
                "area": int(area),
                "confidence": _estimate_confidence(area, w, h),
            })

    return detections


def detect_units_by_template(img: np.ndarray) -> list[dict]:
    """Detect units using template matching with reference images.

    Templates should be placed in backend/app/templates/ as PNG files,
    named by unit type (e.g., super_yeti.png, barbarian_king.png).
    """
    if not TEMPLATES_DIR.exists():
        return []

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    detections: list[dict] = []

    for template_path in TEMPLATES_DIR.glob("*.png"):
        template = cv2.imread(str(template_path), cv2.IMREAD_GRAYSCALE)
        if template is None:
            continue

        unit_name = template_path.stem

        # Multi-scale template matching
        for scale in [0.5, 0.75, 1.0, 1.25, 1.5]:
            th, tw = template.shape[:2]
            new_w = int(tw * scale)
            new_h = int(th * scale)
            if new_w < 10 or new_h < 10:
                continue
            if new_w > img.shape[1] or new_h > img.shape[0]:
                continue

            scaled = cv2.resize(template, (new_w, new_h))
            result = cv2.matchTemplate(gray, scaled, cv2.TM_CCOEFF_NORMED)
            threshold = 0.7
            locations = np.where(result >= threshold)

            for pt in zip(*locations[::-1]):
                detections.append({
                    "category": unit_name,
                    "bbox": [int(pt[0]), int(pt[1]), new_w, new_h],
                    "center": [int(pt[0] + new_w // 2), int(pt[1] + new_h // 2)],
                    "area": new_w * new_h,
                    "confidence": float(result[pt[1], pt[0]]),
                })

    # Non-maximum suppression to remove overlapping detections
    return _nms(detections, iou_threshold=0.4)


def detect_all(image_bytes: bytes) -> dict:
    """Run all detection methods and return combined results."""
    arr = np.frombuffer(image_bytes, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Failed to decode image")

    h, w = img.shape[:2]

    color_detections = detect_units_by_color(img)
    template_detections = detect_units_by_template(img)

    all_detections = _nms(color_detections + template_detections, iou_threshold=0.4)

    # Summarize by category
    summary: dict[str, int] = {}
    for d in all_detections:
        cat = d["category"]
        summary[cat] = summary.get(cat, 0) + 1

    return {
        "frame_size": [w, h],
        "detections": all_detections,
        "summary": summary,
        "total_detected": len(all_detections),
    }


def _estimate_confidence(area: int, w: int, h: int) -> float:
    """Heuristic confidence based on region shape and size."""
    aspect_ratio = w / max(h, 1)
    # Units tend to be roughly square-ish (0.5 ~ 2.0)
    shape_score = 1.0 - min(abs(aspect_ratio - 1.0), 1.0)
    # Larger regions (within range) are more likely to be real units
    size_score = min(area / 5000, 1.0)
    return round(0.4 * shape_score + 0.6 * size_score, 3)


def _nms(detections: list[dict], iou_threshold: float) -> list[dict]:
    """Simple non-maximum suppression."""
    if not detections:
        return []

    detections = sorted(detections, key=lambda d: d["confidence"], reverse=True)
    keep: list[dict] = []

    for det in detections:
        if all(_iou(det["bbox"], k["bbox"]) < iou_threshold for k in keep):
            keep.append(det)

    return keep


def _iou(box1: list[int], box2: list[int]) -> float:
    """Compute IoU between two [x, y, w, h] boxes."""
    x1, y1, w1, h1 = box1
    x2, y2, w2, h2 = box2

    xi = max(x1, x2)
    yi = max(y1, y2)
    xj = min(x1 + w1, x2 + w2)
    yj = min(y1 + h1, y2 + h2)

    inter = max(0, xj - xi) * max(0, yj - yi)
    union = w1 * h1 + w2 * h2 - inter

    return inter / max(union, 1)
