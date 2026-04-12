"use client";

import { useState } from "react";

interface Defense {
  type: string;
  label: string;
  bbox: number[];
  center: number[];
  dps: number;
  range_tiles: number;
}

interface DangerZone {
  bbox: number[];
  center: number[];
  max_dps: number;
}

interface HeatmapResult {
  frame_size: number[];
  heatmap_image: string;
  defenses: Defense[];
  danger_zones: DangerZone[];
  total_defenses: number;
}

interface Props {
  frameDataUrl: string;
  timestamp: string;
}

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

export default function HeatmapView({ frameDataUrl, timestamp }: Props) {
  const [result, setResult] = useState<HeatmapResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runHeatmap = async () => {
    setLoading(true);
    setError(null);

    try {
      const blob = dataUrlToBlob(frameDataUrl);
      const form = new FormData();
      form.append("frame", blob, "frame.jpg");

      const res = await fetch("/api/generate-heatmap", {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(data.error);
      }

      setResult(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "ヒートマップ生成に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <button
          onClick={runHeatmap}
          disabled={loading}
          className="px-3 py-1.5 text-sm font-medium rounded-lg bg-red-600 hover:bg-red-500 disabled:bg-gray-600 disabled:text-gray-400 text-white transition-colors"
        >
          {loading ? "生成中..." : "DPSヒートマップ"}
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
          {/* Heatmap image */}
          <div className="relative inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={result.heatmap_image}
              alt={`DPS Heatmap ${timestamp}`}
              className="rounded-lg max-w-full"
            />
          </div>

          {/* Defense summary */}
          <div className="bg-gray-800/50 rounded-lg p-3 space-y-2">
            <h5 className="text-xs font-semibold text-gray-400 uppercase">
              検出された防衛施設: {result.total_defenses}件
            </h5>
            {result.total_defenses === 0 ? (
              <p className="text-sm text-gray-500">
                防衛施設が検出されませんでした。村のスクリーンショットで再試行してください。
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {result.defenses.map((def, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-sm bg-gray-700/50 rounded px-2 py-1"
                  >
                    <span className="text-gray-300">{def.label}</span>
                    <span className="text-red-400 font-mono text-xs">
                      DPS: {def.dps}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Danger zones */}
          {result.danger_zones.length > 0 && (
            <div className="bg-red-900/20 rounded-lg p-3">
              <h5 className="text-xs font-semibold text-red-400 uppercase mb-2">
                高DPSゾーン ({result.danger_zones.length}箇所)
              </h5>
              <p className="text-sm text-gray-400">
                赤色が濃いエリアはDPSが集中しており、ユニットが溶けやすい危険地帯です。
                攻めルートはこれらのゾーンを避けるか、フリーズ/インビジで対処してください。
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
