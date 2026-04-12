"use client";

import { useState, useCallback } from "react";
import PlayerInput, { PlayerData } from "@/components/PlayerInput";
import VideoUpload from "@/components/VideoUpload";
import FrameTimeline from "@/components/FrameTimeline";
import ChatWindow from "@/components/ChatWindow";
import StatsPanel from "@/components/StatsPanel";

interface FrameAnalysis {
  timestamp: string;
  heroes: number;
  tanks: number;
  dps: number;
  support: number;
  spells_active: number;
  siege: number;
  total: number;
  note: string;
}

export default function Home() {
  const [playerData, setPlayerData] = useState<PlayerData | null>(null);
  const [frames, setFrames] = useState<string[]>([]);
  const [timestamps, setTimestamps] = useState<string[]>([]);
  const [selectedFrameIndex, setSelectedFrameIndex] = useState<number | null>(
    null
  );
  const [analysisResults, setAnalysisResults] = useState<FrameAnalysis[]>([]);

  const handleFramesExtracted = useCallback(
    (newFrames: string[], newTimestamps: string[]) => {
      setFrames(newFrames);
      setTimestamps(newTimestamps);
      setSelectedFrameIndex(null);
      setAnalysisResults([]);
    },
    []
  );

  return (
    <div className="flex flex-col h-screen">
      <header className="border-b border-gray-800 bg-gray-900 px-6 py-3 flex items-center gap-3">
        <h1 className="text-xl font-bold text-amber-400">Chief Advisor</h1>
        <span className="text-sm text-gray-500">
          CoC TH18 リプレイ分析AI
        </span>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel (35%) */}
        <aside className="w-[35%] border-r border-gray-800 bg-gray-900/50 overflow-y-auto p-4 space-y-6 flex-shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
              プレイヤー情報
            </h2>
            <PlayerInput
              onPlayerLoaded={setPlayerData}
              playerData={playerData}
            />
          </div>

          <VideoUpload onFramesExtracted={handleFramesExtracted} />

          <StatsPanel />
        </aside>

        {/* Right Panel (65%) */}
        <main className="flex-1 flex flex-col min-w-0">
          <FrameTimeline
            frames={frames}
            timestamps={timestamps}
            selectedIndex={selectedFrameIndex}
            onSelectFrame={setSelectedFrameIndex}
            onAnalysisComplete={setAnalysisResults}
          />
          <ChatWindow
            playerData={playerData}
            frames={frames}
            selectedFrameIndex={selectedFrameIndex}
            analysisResults={analysisResults}
          />
        </main>
      </div>
    </div>
  );
}
