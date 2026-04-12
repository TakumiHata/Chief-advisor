import cv2
import numpy as np


def analyze_frame(image_bytes: bytes) -> dict:
    """Analyze a single frame image with OpenCV.

    Returns basic image metrics as a foundation for future
    unit detection and heatmap generation.
    """
    arr = np.frombuffer(image_bytes, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Failed to decode image")

    h, w = img.shape[:2]

    # Average brightness (grayscale mean)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    brightness = float(gray.mean())

    # Edge density via Canny — proxy for scene complexity
    edges = cv2.Canny(gray, 100, 200)
    edge_density = float(edges.mean() / 255.0)

    # Dominant colors via k-means (top 3)
    pixels = img.reshape(-1, 3).astype(np.float32)
    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 10, 1.0)
    _, _, centers = cv2.kmeans(pixels, 3, None, criteria, 3, cv2.KMEANS_PP_CENTERS)
    dominant_colors = centers.astype(int).tolist()

    return {
        "width": w,
        "height": h,
        "dominant_colors": dominant_colors,
        "brightness": round(brightness, 2),
        "edge_density": round(edge_density, 4),
    }
