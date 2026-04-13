"use client";

import { useState } from "react";

interface FrameAnalysis {
  timestamp: string;
  heroes: number;
  tanks: number;
  dps: number;
  support: number;
  spells_active: number;
  siege: number;
  total: number;
  active_defenses: string;
  destroyed_defenses: string;
  spell_effects: string;
  hero_status: string;
  damage_source: string;
  note: string;
}

interface Props {
  frames: string[];
  timestamps: string[];
  onAnalysisComplete?: (results: FrameAnalysis[]) => void;
}

const CATEGORY_CONFIG = [
  { key: "total", label: "合計", color: "#f59e0b" },
  { key: "heroes", label: "ヒーロー", color: "#3b82f6" },
  { key: "tanks", label: "タンク", color: "#10b981" },
  { key: "dps", label: "火力", color: "#ef4444" },
  { key: "support", label: "サポート", color: "#a855f7" },
  { key: "siege", label: "攻城", color: "#6b7280" },
] as const;

export default function UnitTracker({ frames, timestamps, onAnalysisComplete }: Props) {
  const [results, setResults] = useState<FrameAnalysis[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, timestamp: "" });
  const [selectedPoint, setSelectedPoint] = useState<FrameAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [providerInfo, setProviderInfo] = useState<string | null>(null);

  const runAnalysis = async () => {
    setAnalyzing(true);
    setResults([]);
    setSelectedPoint(null);
    setError(null);
    setProviderInfo(null);

    try {
      const res = await fetch("/api/analyze-units", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frames, timestamps }),
      });

      if (!res.ok || !res.body) {
        setError("分析の開始に失敗しました");
        setAnalyzing(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);
            if (data.type === "info") {
              setProviderInfo(`${data.provider} (${data.model})`);
            } else if (data.type === "progress") {
              setProgress({
                current: data.current,
                total: data.total,
                timestamp: data.timestamp,
              });
            } else if (data.type === "frame_result") {
              setResults((prev) => [...prev, data.data]);
            } else if (data.type === "complete" && data.results) {
              onAnalysisComplete?.(data.results);
            }
          } catch {
            // skip malformed lines
          }
        }
      }
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setAnalyzing(false);
    }
  };

  const maxTotal = Math.max(...results.map((r) => r.total), 1);

  // Find biggest drops
  const drops: { from: FrameAnalysis; to: FrameAnalysis; loss: number }[] = [];
  for (let i = 1; i < results.length; i++) {
    const loss = results[i - 1].total - results[i].total;
    if (loss >= 3) {
      drops.push({ from: results[i - 1], to: results[i], loss });
    }
  }
  drops.sort((a, b) => b.loss - a.loss);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
          ユニット残数分析
        </h4>
        <button
          onClick={runAnalysis}
          disabled={analyzing || frames.length === 0}
          className="px-4 py-1.5 text-sm font-medium rounded-lg bg-amber-600 hover:bg-amber-500 disabled:bg-gray-600 disabled:text-gray-400 text-white transition-colors"
        >
          {analyzing ? "分析中..." : "残数を分析"}
        </button>
      </div>

      {/* Progress */}
      {analyzing && (
        <div className="space-y-1">
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-amber-500 h-2 rounded-full transition-all"
              style={{
                width: `${progress.total ? (progress.current / progress.total) * 100 : 0}%`,
              }}
            />
          </div>
          <p className="text-xs text-gray-500">
            {progress.current}/{progress.total} フレーム分析中... ({progress.timestamp})
            {providerInfo && <span className="ml-2 text-gray-600">| {providerInfo}</span>}
          </p>
        </div>
      )}

      {error && (
        <div className="text-sm text-red-400 bg-red-900/20 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {/* Graph */}
      {results.length > 1 && (
        <div className="space-y-3">
          {/* SVG line chart */}
          <div className="bg-gray-800/50 rounded-lg p-4">
            <svg
              viewBox={`0 0 ${results.length * 40 + 40} 200`}
              className="w-full h-48"
              preserveAspectRatio="none"
            >
              {/* Grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
                <line
                  key={ratio}
                  x1={30}
                  y1={10 + (1 - ratio) * 170}
                  x2={results.length * 40 + 30}
                  y2={10 + (1 - ratio) * 170}
                  stroke="#374151"
                  strokeWidth={0.5}
                />
              ))}

              {/* Lines for each category */}
              {CATEGORY_CONFIG.map(({ key, color }) => (
                <polyline
                  key={key}
                  fill="none"
                  stroke={color}
                  strokeWidth={key === "total" ? 2.5 : 1.5}
                  opacity={key === "total" ? 1 : 0.7}
                  points={results
                    .map((r, i) => {
                      const x = 30 + i * 40 + 20;
                      const y =
                        10 +
                        (1 - (r[key as keyof FrameAnalysis] as number) / maxTotal) * 170;
                      return `${x},${y}`;
                    })
                    .join(" ")}
                />
              ))}

              {/* Clickable points (total line) */}
              {results.map((r, i) => {
                const x = 30 + i * 40 + 20;
                const y = 10 + (1 - r.total / maxTotal) * 170;
                return (
                  <circle
                    key={i}
                    cx={x}
                    cy={y}
                    r={4}
                    fill={selectedPoint === r ? "#f59e0b" : "#1f2937"}
                    stroke="#f59e0b"
                    strokeWidth={1.5}
                    className="cursor-pointer"
                    onClick={() => setSelectedPoint(r)}
                  />
                );
              })}

              {/* X-axis labels */}
              {results.map((r, i) => {
                if (i % 2 !== 0 && i !== results.length - 1) return null;
                return (
                  <text
                    key={i}
                    x={30 + i * 40 + 20}
                    y={195}
                    textAnchor="middle"
                    fill="#6b7280"
                    fontSize={9}
                  >
                    {r.timestamp}
                  </text>
                );
              })}
            </svg>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 mt-2">
              {CATEGORY_CONFIG.map(({ key, label, color }) => (
                <span key={key} className="flex items-center gap-1 text-xs text-gray-400">
                  <span
                    className="w-3 h-0.5 inline-block rounded"
                    style={{ backgroundColor: color }}
                  />
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* Selected point detail */}
          {selectedPoint && (
            <div className="bg-gray-800/50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <h5 className="text-sm font-semibold text-amber-400">
                  {selectedPoint.timestamp}
                </h5>
                <span className="text-xs text-gray-500">
                  合計: {selectedPoint.total}体
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-2">
                <Stat label="ヒーロー" value={selectedPoint.heroes} color="#3b82f6" />
                <Stat label="タンク" value={selectedPoint.tanks} color="#10b981" />
                <Stat label="火力" value={selectedPoint.dps} color="#ef4444" />
                <Stat label="サポート" value={selectedPoint.support} color="#a855f7" />
                <Stat label="スペル" value={selectedPoint.spells_active} color="#22d3ee" />
                <Stat label="攻城" value={selectedPoint.siege} color="#6b7280" />
              </div>
              <p className="text-sm text-gray-300">{selectedPoint.note}</p>
              {(selectedPoint.active_defenses || selectedPoint.damage_source || selectedPoint.spell_effects || selectedPoint.hero_status) && (
                <div className="mt-2 pt-2 border-t border-gray-700 space-y-1">
                  {selectedPoint.damage_source && (
                    <p className="text-xs text-red-400">
                      <span className="text-gray-500">被害源:</span> {selectedPoint.damage_source}
                    </p>
                  )}
                  {selectedPoint.active_defenses && (
                    <p className="text-xs text-orange-400">
                      <span className="text-gray-500">稼働中防衛:</span> {selectedPoint.active_defenses}
                    </p>
                  )}
                  {selectedPoint.spell_effects && (
                    <p className="text-xs text-cyan-400">
                      <span className="text-gray-500">発動中呪文:</span> {selectedPoint.spell_effects}
                    </p>
                  )}
                  {selectedPoint.hero_status && (
                    <p className="text-xs text-blue-400">
                      <span className="text-gray-500">ヒーロー:</span> {selectedPoint.hero_status}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Biggest drops */}
          {drops.length > 0 && (
            <div className="bg-red-900/20 rounded-lg p-3">
              <h5 className="text-xs font-semibold text-red-400 uppercase mb-2">
                大量ロストポイント
              </h5>
              <div className="space-y-1">
                {drops.slice(0, 5).map((d, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-sm cursor-pointer hover:bg-red-900/20 rounded px-2 py-1"
                    onClick={() => setSelectedPoint(d.to)}
                  >
                    <span className="text-gray-300">
                      {d.from.timestamp} → {d.to.timestamp}
                    </span>
                    <span className="text-red-400 font-mono">-{d.loss}体</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {results.length === 0 && !analyzing && frames.length > 0 && (
        <p className="text-sm text-gray-500">
          「残数を分析」をクリックすると、5秒間隔でフレームを分析し、ユニット残数の推移を可視化します。
        </p>
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="text-center">
      <div className="text-lg font-bold" style={{ color }}>
        {value}
      </div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}
