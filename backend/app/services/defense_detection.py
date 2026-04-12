"""Defense building detection and DPS heatmap generation.

Detects key defensive structures in CoC village screenshots:
- Inferno Tower (single/multi)
- Eagle Artillery
- Scattershot
- X-Bow
- Air Defense
- Wizard Tower
- Bomb Tower

Uses HSV color segmentation to identify defensive structures,
then generates a DPS distribution heatmap based on known
range and damage values.
"""

import cv2
import numpy as np

# TH18 defense stats: (dps, range_tiles)
# Range is in "tiles" — we convert to pixels based on frame size
DEFENSE_STATS: dict[str, dict] = {
    "inferno_tower": {"dps": 180, "range_tiles": 9, "label": "インフェルノタワー"},
    "eagle_artillery": {"dps": 400, "range_tiles": 50, "label": "イーグル砲"},
    "scattershot": {"dps": 200, "range_tiles": 10, "label": "スキャッターショット"},
    "xbow": {"dps": 160, "range_tiles": 11, "label": "クロスボウ"},
    "air_defense": {"dps": 400, "range_tiles": 10, "label": "対空砲"},
    "wizard_tower": {"dps": 104, "range_tiles": 7, "label": "ウィザードの塔"},
    "bomb_tower": {"dps": 76, "range_tiles": 6, "label": "ボムタワー"},
}

# HSV color profiles for defense structures
DEFENSE_COLOR_PROFILES: dict[str, list[tuple[np.ndarray, np.ndarray]]] = {
    "inferno_tower": [
        # Orange-red glow of inferno
        (np.array([0, 120, 150]), np.array([12, 255, 255])),
        (np.array([170, 120, 150]), np.array([180, 255, 255])),
    ],
    "eagle_artillery": [
        # Dark metallic with blue highlights
        (np.array([95, 50, 80]), np.array([115, 200, 200])),
    ],
    "scattershot": [
        # Stone gray with purple tint
        (np.array([120, 30, 100]), np.array([145, 150, 220])),
    ],
    "xbow": [
        # Dark wood/metal tones
        (np.array([10, 60, 60]), np.array([25, 180, 180])),
    ],
    "air_defense": [
        # Red rocket tips
        (np.array([0, 150, 100]), np.array([8, 255, 255])),
        (np.array([172, 150, 100]), np.array([180, 255, 255])),
    ],
    "wizard_tower": [
        # Purple/blue magic glow
        (np.array([130, 80, 100]), np.array([155, 255, 255])),
    ],
    "bomb_tower": [
        # Dark gray stone
        (np.array([0, 0, 60]), np.array([180, 40, 130])),
    ],
}

MIN_CONTOUR_AREA = 300
MAX_CONTOUR_AREA = 40000

# Approximate pixels per tile (assumes ~40 tile wide village on a 1920px frame)
PIXELS_PER_TILE_BASE = 48


def detect_defenses(image_bytes: bytes) -> dict:
    """Detect defensive buildings in a village screenshot."""
    arr = np.frombuffer(image_bytes, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Failed to decode image")

    h, w = img.shape[:2]
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    detections: list[dict] = []

    for defense_type, ranges in DEFENSE_COLOR_PROFILES.items():
        combined_mask = np.zeros((h, w), dtype=np.uint8)
        for lower, upper in ranges:
            mask = cv2.inRange(hsv, lower, upper)
            combined_mask = cv2.bitwise_or(combined_mask, mask)

        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
        combined_mask = cv2.morphologyEx(combined_mask, cv2.MORPH_CLOSE, kernel)
        combined_mask = cv2.morphologyEx(combined_mask, cv2.MORPH_OPEN, kernel)

        contours, _ = cv2.findContours(
            combined_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )

        for contour in contours:
            area = cv2.contourArea(contour)
            if area < MIN_CONTOUR_AREA or area > MAX_CONTOUR_AREA:
                continue

            x, y, bw, bh = cv2.boundingRect(contour)
            cx, cy = x + bw // 2, y + bh // 2
            stats = DEFENSE_STATS[defense_type]

            detections.append({
                "type": defense_type,
                "label": stats["label"],
                "bbox": [x, y, bw, bh],
                "center": [cx, cy],
                "area": int(area),
                "dps": stats["dps"],
                "range_tiles": stats["range_tiles"],
            })

    detections = _nms(detections, iou_threshold=0.4)

    summary: dict[str, int] = {}
    for d in detections:
        t = d["type"]
        summary[t] = summary.get(t, 0) + 1

    return {
        "frame_size": [w, h],
        "defenses": detections,
        "summary": summary,
        "total_detected": len(detections),
    }


def generate_heatmap(image_bytes: bytes) -> dict:
    """Generate a DPS distribution heatmap from detected defenses.

    Returns a base64-encoded heatmap image overlaid on the original frame.
    """
    arr = np.frombuffer(image_bytes, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Failed to decode image")

    h, w = img.shape[:2]
    pixels_per_tile = PIXELS_PER_TILE_BASE * (w / 1920)

    # Detect defenses
    detection_result = detect_defenses(image_bytes)
    defenses = detection_result["defenses"]

    # Build DPS accumulation map
    dps_map = np.zeros((h, w), dtype=np.float64)

    for defense in defenses:
        cx, cy = defense["center"]
        dps = defense["dps"]
        range_px = int(defense["range_tiles"] * pixels_per_tile)

        # Create circular DPS influence
        y_coords, x_coords = np.ogrid[:h, :w]
        dist = np.sqrt((x_coords - cx) ** 2 + (y_coords - cy) ** 2)

        # DPS falls off linearly with distance
        influence = np.clip(1.0 - dist / range_px, 0, 1) * dps
        dps_map += influence

    # Normalize and colorize
    if dps_map.max() > 0:
        normalized = (dps_map / dps_map.max() * 255).astype(np.uint8)
    else:
        normalized = np.zeros((h, w), dtype=np.uint8)

    heatmap_colored = cv2.applyColorMap(normalized, cv2.COLORMAP_JET)

    # Blend with original image
    overlay = cv2.addWeighted(img, 0.5, heatmap_colored, 0.5, 0)

    # Draw defense positions
    for defense in defenses:
        cx, cy = defense["center"]
        range_px = int(defense["range_tiles"] * pixels_per_tile)
        cv2.circle(overlay, (cx, cy), 8, (255, 255, 255), -1)
        cv2.circle(overlay, (cx, cy), range_px, (255, 255, 255), 1)
        label = defense["label"]
        cv2.putText(
            overlay, label, (cx - 20, cy - 15),
            cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1,
        )

    # Encode to base64
    import base64
    _, buffer = cv2.imencode(".jpg", overlay, [cv2.IMWRITE_JPEG_QUALITY, 85])
    heatmap_b64 = base64.b64encode(buffer).decode("utf-8")

    # Find high-DPS zones (top 10% threshold)
    if dps_map.max() > 0:
        threshold = dps_map.max() * 0.7
        danger_mask = (dps_map >= threshold).astype(np.uint8) * 255
        contours, _ = cv2.findContours(
            danger_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )
        danger_zones = []
        for contour in contours:
            x, y, bw, bh = cv2.boundingRect(contour)
            danger_zones.append({
                "bbox": [x, y, bw, bh],
                "center": [x + bw // 2, y + bh // 2],
                "max_dps": float(dps_map[y:y+bh, x:x+bw].max()),
            })
    else:
        danger_zones = []

    return {
        "frame_size": [w, h],
        "heatmap_image": f"data:image/jpeg;base64,{heatmap_b64}",
        "defenses": defenses,
        "danger_zones": danger_zones,
        "total_defenses": len(defenses),
    }


def _nms(detections: list[dict], iou_threshold: float) -> list[dict]:
    if not detections:
        return []
    detections = sorted(detections, key=lambda d: d["area"], reverse=True)
    keep: list[dict] = []
    for det in detections:
        if all(_iou(det["bbox"], k["bbox"]) < iou_threshold for k in keep):
            keep.append(det)
    return keep


def _iou(box1: list[int], box2: list[int]) -> float:
    x1, y1, w1, h1 = box1
    x2, y2, w2, h2 = box2
    xi = max(x1, x2)
    yi = max(y1, y2)
    xj = min(x1 + w1, x2 + w2)
    yj = min(y1 + h1, y2 + h2)
    inter = max(0, xj - xi) * max(0, yj - yi)
    union = w1 * h1 + w2 * h2 - inter
    return inter / max(union, 1)
