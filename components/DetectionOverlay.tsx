"use client";

import { useState } from "react";

interface Detection {
  category: string;
  bbox: number[];
  center: number[];
  area: number;
  confidence: number;
}

interface DetectionResult {
  frame_size: number[];
  detections: Detection[];
  summary: Record<string, number>;
  total_detected: number;
}

interface Props {
  frameDataUrl: string;
  timestamp: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  hero_king: "バーバリアンキング",
  hero_queen: "アーチャークイーン",
  hero_warden: "グランドウォーデン",
  spell_rage: "レイジスペル",
  spell_freeze: "フリーズスペル",
  troops_general: "ユニット",
};

const CATEGORY_COLORS: Record<string, string> = {
  hero_king: "#3b82f6",
  hero_queen: "#ec4899",
  hero_warden: "#a3e635",
  spell_rage: "#a855f7",
  spell_freeze: "#22d3ee",
  troops_general: "#f59e0b",
};

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] ?? "image/jpeg";
  const bytes = atob(base64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    arr[i] = bytes.charCodeAt(i);
  }
  return new Blob([arr], { type: mime });
}

export default function DetectionOverlay({ frameDataUrl, timestamp }: Props) {
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runDetection = async () => {
    setLoading(true);
    setError(null);

    try {
      const blob = dataUrlToBlob(frameDataUrl);
      const form = new FormData();
      form.append("frame", blob, "frame.jpg");

      const res = await fetch("/api/detect-units", {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(data.error);
      }

      setResult(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "検出に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <button
          onClick={runDetection}
          disabled={loading}
          className="px-3 py-1.5 text-sm font-medium rounded-lg bg-amber-600 hover:bg-amber-500 disabled:bg-gray-600 disabled:text-gray-400 text-white transition-colors"
        >
          {loading ? "検出中..." : "ユニット検出"}
        </button>
        <span className="text-xs text-gray-500">{timestamp}</span>
      </div>

      {error && (
        <div className="text-sm text-red-400 bg-red-900/20 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-3">
          {/* Detection visualization */}
          <div className="relative inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={frameDataUrl}
              alt={`Detection ${timestamp}`}
              className="rounded-lg max-w-full"
            />
            {/* Bounding box overlay */}
            <svg
              className="absolute inset-0 w-full h-full"
              viewBox={`0 0 ${result.frame_size[0]} ${result.frame_size[1]}`}
              preserveAspectRatio="none"
            >
              {result.detections.map((det, i) => (
                <g key={i}>
                  <rect
                    x={det.bbox[0]}
                    y={det.bbox[1]}
                    width={det.bbox[2]}
                    height={det.bbox[3]}
                    fill="none"
                    stroke={CATEGORY_COLORS[det.category] ?? "#ffffff"}
                    strokeWidth={Math.max(result.frame_size[0] / 400, 2)}
                    opacity={0.8}
                  />
                  <text
                    x={det.bbox[0]}
                    y={det.bbox[1] - 4}
                    fill={CATEGORY_COLORS[det.category] ?? "#ffffff"}
                    fontSize={Math.max(result.frame_size[0] / 60, 10)}
                    fontWeight="bold"
                  >
                    {CATEGORY_LABELS[det.category] ?? det.category}
                  </text>
                </g>
              ))}
            </svg>
          </div>

          {/* Summary */}
          <div className="bg-gray-800/50 rounded-lg p-3">
            <h5 className="text-xs font-semibold text-gray-400 uppercase mb-2">
              検出結果: {result.total_detected}件
            </h5>
            {result.total_detected === 0 ? (
              <p className="text-sm text-gray-500">
                検出されたユニットはありません。テンプレート画像を追加すると精度が向上します。
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {Object.entries(result.summary).map(([cat, count]) => (
                  <span
                    key={cat}
                    className="inline-flex items-center gap-1.5 text-sm px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: `${CATEGORY_COLORS[cat] ?? "#6b7280"}20`,
                      color: CATEGORY_COLORS[cat] ?? "#9ca3af",
                    }}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: CATEGORY_COLORS[cat] ?? "#6b7280" }}
                    />
                    {CATEGORY_LABELS[cat] ?? cat}: {count}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
