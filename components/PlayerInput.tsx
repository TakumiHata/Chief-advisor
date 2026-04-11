"use client";

import { useState } from "react";

interface Troop {
  name: string;
  level: number;
  maxLevel: number;
  village: string;
}

interface Hero {
  name: string;
  level: number;
  maxLevel: number;
}

export interface PlayerData {
  name: string;
  tag: string;
  townHallLevel: number;
  troops: Troop[];
  heroes: Hero[];
  spells: Troop[];
}

interface Props {
  onPlayerLoaded: (data: PlayerData) => void;
  playerData: PlayerData | null;
}

export default function PlayerInput({ onPlayerLoaded, playerData }: Props) {
  const [tag, setTag] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tag.trim()) return;

    setLoading(true);
    setError("");

    const formattedTag = tag.startsWith("#") ? tag : `#${tag}`;

    try {
      const res = await fetch(`/api/player?tag=${encodeURIComponent(formattedTag)}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "プレイヤーデータの取得に失敗しました");
        return;
      }
      onPlayerLoaded(data);
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          placeholder="#ABC123"
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          className="flex-1 rounded-lg bg-gray-800 border border-gray-700 px-4 py-2 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-amber-600 px-4 py-2 font-semibold text-white hover:bg-amber-500 disabled:opacity-50 transition-colors"
        >
          {loading ? "取得中..." : "検索"}
        </button>
      </form>

      {error && (
        <p className="text-red-400 text-sm">{error}</p>
      )}

      {playerData && (
        <div className="space-y-3">
          <div className="rounded-lg bg-gray-800 border border-gray-700 p-4">
            <h3 className="text-lg font-bold text-amber-400">
              {playerData.name} ({playerData.tag})
            </h3>
            <p className="text-gray-400">タウンホール Lv.{playerData.townHallLevel}</p>
          </div>

          {playerData.heroes.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-400 mb-2">ヒーロー</h4>
              <div className="grid grid-cols-2 gap-2">
                {playerData.heroes.map((hero) => (
                  <div
                    key={hero.name}
                    className="rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm"
                  >
                    <span className="text-gray-200">{hero.name}</span>
                    <span className="text-amber-400 ml-2">Lv.{hero.level}</span>
                    <span className="text-gray-600">/{hero.maxLevel}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {playerData.troops.filter((t) => t.village === "home").length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-400 mb-2">兵種</h4>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {playerData.troops
                  .filter((t) => t.village === "home")
                  .map((troop) => (
                    <div
                      key={troop.name}
                      className="rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm"
                    >
                      <span className="text-gray-200">{troop.name}</span>
                      <span className="text-amber-400 ml-2">Lv.{troop.level}</span>
                      <span className="text-gray-600">/{troop.maxLevel}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {playerData.spells.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-400 mb-2">呪文</h4>
              <div className="grid grid-cols-2 gap-2">
                {playerData.spells.map((spell) => (
                  <div
                    key={spell.name}
                    className="rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm"
                  >
                    <span className="text-gray-200">{spell.name}</span>
                    <span className="text-amber-400 ml-2">Lv.{spell.level}</span>
                    <span className="text-gray-600">/{spell.maxLevel}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
