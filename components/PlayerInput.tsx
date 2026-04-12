"use client";

import { useState } from "react";
import { parseCocJson, type ParsedPlayerData } from "@/lib/coc-json-parser";

export type PlayerData = ParsedPlayerData;

interface Props {
  onPlayerLoaded: (data: PlayerData) => void;
  playerData: PlayerData | null;
}

export default function PlayerInput({ onPlayerLoaded, playerData }: Props) {
  const [jsonText, setJsonText] = useState("");
  const [error, setError] = useState("");
  const [showImport, setShowImport] = useState(false);

  const handleImport = () => {
    setError("");
    try {
      const parsed = parseCocJson(jsonText);
      if (!parsed.tag) {
        setError("有効なCoCエクスポートデータではありません");
        return;
      }
      onPlayerLoaded(parsed);
      setShowImport(false);
      setJsonText("");
    } catch {
      setError("JSONの解析に失敗しました。ゲーム内からコピーしたデータを貼り付けてください。");
    }
  };

  return (
    <div className="space-y-4">
      {!playerData && !showImport && (
        <button
          onClick={() => setShowImport(true)}
          className="w-full rounded-lg border-2 border-dashed border-gray-700 hover:border-amber-500 px-4 py-6 text-gray-400 hover:text-amber-400 transition-colors"
        >
          ゲーム内JSONデータを貼り付け
          <span className="block text-xs text-gray-600 mt-1">
            設定 → 詳細設定 → JSON形式で村のデータを転送 → コピー
          </span>
        </button>
      )}

      {showImport && (
        <div className="space-y-2">
          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            placeholder='{"tag":"#ABC123","buildings":[...],...}'
            rows={4}
            className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
          />
          <div className="flex gap-2">
            <button
              onClick={handleImport}
              disabled={!jsonText.trim()}
              className="flex-1 rounded-lg bg-amber-600 px-4 py-2 font-semibold text-white hover:bg-amber-500 disabled:opacity-50 transition-colors"
            >
              読み込み
            </button>
            <button
              onClick={() => {
                setShowImport(false);
                setJsonText("");
                setError("");
              }}
              className="rounded-lg bg-gray-700 px-4 py-2 text-gray-300 hover:bg-gray-600 transition-colors"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {playerData && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="rounded-lg bg-gray-800 border border-gray-700 p-4 flex-1">
              <h3 className="text-lg font-bold text-amber-400">
                {playerData.tag}
              </h3>
              <p className="text-gray-400">
                タウンホール Lv.{playerData.townHallLevel}
              </p>
            </div>
            <button
              onClick={() => {
                onPlayerLoaded(null as unknown as PlayerData);
                setShowImport(false);
              }}
              className="ml-2 text-xs text-gray-500 hover:text-gray-300"
            >
              リセット
            </button>
          </div>

          {/* Heroes */}
          {playerData.heroes.length > 0 && (
            <Section title="ヒーロー">
              {playerData.heroes.map((hero) => (
                <Badge key={hero.name} name={hero.name} level={hero.level}>
                  {hero.upgrading && (
                    <span className="text-green-400 ml-1 text-xs">⬆</span>
                  )}
                </Badge>
              ))}
            </Section>
          )}

          {/* Equipment */}
          {playerData.equipment.length > 0 && (
            <Section title="装備">
              {playerData.equipment.map((eq) => (
                <Badge key={eq.name} name={eq.name} level={eq.level} />
              ))}
            </Section>
          )}

          {/* Pets */}
          {playerData.pets.length > 0 && (
            <Section title="ペット">
              {playerData.pets.map((pet) => (
                <Badge key={pet.name} name={pet.name} level={pet.level} />
              ))}
            </Section>
          )}

          {/* Units */}
          {playerData.units.length > 0 && (
            <Section title="兵種" scrollable>
              {playerData.units.map((unit) => (
                <Badge key={unit.name} name={unit.name} level={unit.level} />
              ))}
            </Section>
          )}

          {/* Siege Machines */}
          {playerData.siegeMachines.length > 0 && (
            <Section title="攻城兵器">
              {playerData.siegeMachines.map((s) => (
                <Badge key={s.name} name={s.name} level={s.level} />
              ))}
            </Section>
          )}

          {/* Spells */}
          {playerData.spells.length > 0 && (
            <Section title="呪文">
              {playerData.spells.map((spell) => (
                <Badge key={spell.name} name={spell.name} level={spell.level} />
              ))}
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  children,
  scrollable,
}: {
  title: string;
  children: React.ReactNode;
  scrollable?: boolean;
}) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-gray-400 mb-2">{title}</h4>
      <div
        className={`grid grid-cols-2 gap-2 ${scrollable ? "max-h-48 overflow-y-auto" : ""}`}
      >
        {children}
      </div>
    </div>
  );
}

function Badge({
  name,
  level,
  children,
}: {
  name: string;
  level: number;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm">
      <span className="text-gray-200">{name}</span>
      <span className="text-amber-400 ml-2">Lv.{level}</span>
      {children}
    </div>
  );
}
