"use client";

import { useState, useEffect, useCallback } from "react";

interface OverallStats {
  total_attacks: number;
  average_stars: number;
  average_destruction: number;
  three_star_rate: number;
}

interface CompositionStats {
  attacks: number;
  average_stars: number;
  average_destruction: number;
  three_star_rate: number;
}

interface TrendPoint {
  attack_number: number;
  stars: number;
  rolling_avg_stars: number;
  rolling_avg_destruction: number;
}

interface StatsData {
  total_attacks: number;
  overall_stats: OverallStats;
  by_composition: Record<string, CompositionStats>;
  by_layout: Record<string, CompositionStats>;
  trend: TrendPoint[];
}

interface ReplayForm {
  army_composition: string;
  base_layout: string;
  stars: number;
  destruction_percentage: number;
  notes: string;
}

const ARMY_COMPOSITIONS = [
  "スーパーイエティスマッシュ",
  "イエティボウラー",
  "ゴレウィッチ",
  "ラヴァバル",
  "ドラゴンラッシュ",
  "ハイブリッド",
  "その他",
];

const BASE_LAYOUTS = [
  "島型",
  "リング型",
  "対称型",
  "非対称型",
  "コンパクト型",
  "スプレッド型",
  "その他",
];

export default function StatsPanel() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<ReplayForm>({
    army_composition: ARMY_COMPOSITIONS[0],
    base_layout: BASE_LAYOUTS[0],
    stars: 3,
    destruction_percentage: 100,
    notes: "",
  });

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stats");
      if (res.ok) setStats(await res.json());
    } catch {
      // Backend not available
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/replays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setShowForm(false);
        setForm({
          army_composition: ARMY_COMPOSITIONS[0],
          base_layout: BASE_LAYOUTS[0],
          stars: 3,
          destruction_percentage: 100,
          notes: "",
        });
        fetchStats();
      }
    } catch {
      // ignore
    } finally {
      setSubmitting(false);
    }
  };

  const starDisplay = (n: number) => {
    return "★".repeat(n) + "☆".repeat(3 - n);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
          攻め統計
        </h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-3 py-1 text-xs font-medium rounded-lg bg-amber-600 hover:bg-amber-500 text-white transition-colors"
        >
          {showForm ? "閉じる" : "+ 結果を記録"}
        </button>
      </div>

      {/* Record form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-gray-800/50 rounded-lg p-3 space-y-3"
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">編成</label>
              <select
                value={form.army_composition}
                onChange={(e) =>
                  setForm({ ...form, army_composition: e.target.value })
                }
                className="w-full bg-gray-700 text-sm text-gray-200 rounded px-2 py-1.5 border border-gray-600"
              >
                {ARMY_COMPOSITIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">
                配置タイプ
              </label>
              <select
                value={form.base_layout}
                onChange={(e) =>
                  setForm({ ...form, base_layout: e.target.value })
                }
                className="w-full bg-gray-700 text-sm text-gray-200 rounded px-2 py-1.5 border border-gray-600"
              >
                {BASE_LAYOUTS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">星</label>
              <div className="flex gap-2">
                {[0, 1, 2, 3].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setForm({ ...form, stars: s })}
                    className={`px-3 py-1 text-sm rounded ${
                      form.stars === s
                        ? "bg-amber-600 text-white"
                        : "bg-gray-700 text-gray-400"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">
                破壊率 (%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={form.destruction_percentage}
                onChange={(e) =>
                  setForm({
                    ...form,
                    destruction_percentage: Number(e.target.value),
                  })
                }
                className="w-full bg-gray-700 text-sm text-gray-200 rounded px-2 py-1.5 border border-gray-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">メモ</label>
            <input
              type="text"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="気づいた点など..."
              className="w-full bg-gray-700 text-sm text-gray-200 rounded px-2 py-1.5 border border-gray-600 placeholder-gray-500"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full px-3 py-1.5 text-sm font-medium rounded-lg bg-green-600 hover:bg-green-500 disabled:bg-gray-600 text-white transition-colors"
          >
            {submitting ? "保存中..." : "記録する"}
          </button>
        </form>
      )}

      {/* Stats display */}
      {loading && (
        <p className="text-sm text-gray-500">読み込み中...</p>
      )}

      {stats && stats.total_attacks > 0 && (
        <div className="space-y-3">
          {/* Overall */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gray-800/50 rounded-lg p-2 text-center">
              <div className="text-lg font-bold text-amber-400">
                {stats.overall_stats.average_stars}
              </div>
              <div className="text-xs text-gray-500">平均星数</div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-2 text-center">
              <div className="text-lg font-bold text-amber-400">
                {stats.overall_stats.three_star_rate}%
              </div>
              <div className="text-xs text-gray-500">全壊率</div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-2 text-center">
              <div className="text-lg font-bold text-gray-300">
                {stats.overall_stats.average_destruction}%
              </div>
              <div className="text-xs text-gray-500">平均破壊率</div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-2 text-center">
              <div className="text-lg font-bold text-gray-300">
                {stats.total_attacks}
              </div>
              <div className="text-xs text-gray-500">総攻撃数</div>
            </div>
          </div>

          {/* By composition */}
          {Object.keys(stats.by_composition).length > 0 && (
            <div className="bg-gray-800/50 rounded-lg p-3">
              <h5 className="text-xs font-semibold text-gray-400 uppercase mb-2">
                編成別成績
              </h5>
              <div className="space-y-1.5">
                {Object.entries(stats.by_composition).map(([comp, s]) => (
                  <div
                    key={comp}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-gray-300 truncate mr-2">{comp}</span>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-amber-400 text-xs">
                        {starDisplay(Math.round(s.average_stars))}
                      </span>
                      <span className="text-gray-500 text-xs w-12 text-right">
                        {s.attacks}回
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trend */}
          {stats.trend.length > 1 && (
            <div className="bg-gray-800/50 rounded-lg p-3">
              <h5 className="text-xs font-semibold text-gray-400 uppercase mb-2">
                改善傾向 (直近{stats.trend.length}戦)
              </h5>
              <div className="flex items-end gap-0.5 h-16">
                {stats.trend.map((t, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t"
                    style={{
                      height: `${(t.rolling_avg_stars / 3) * 100}%`,
                      backgroundColor:
                        t.rolling_avg_stars >= 2.5
                          ? "#f59e0b"
                          : t.rolling_avg_stars >= 1.5
                            ? "#6b7280"
                            : "#ef4444",
                    }}
                    title={`#${t.attack_number}: ${t.stars}星 (平均${t.rolling_avg_stars})`}
                  />
                ))}
              </div>
              <div className="flex justify-between text-xs text-gray-600 mt-1">
                <span>最初</span>
                <span>最新</span>
              </div>
            </div>
          )}
        </div>
      )}

      {stats && stats.total_attacks === 0 && !showForm && (
        <p className="text-sm text-gray-500">
          まだデータがありません。「+ 結果を記録」から攻め結果を記録してください。
        </p>
      )}
    </div>
  );
}
