"use client";

import UnitTracker from "./UnitTracker";

interface Props {
  frames: string[];
  timestamps: string[];
  selectedIndex: number | null;
  onSelectFrame: (index: number) => void;
}

export default function FrameTimeline({
  frames,
  timestamps,
  selectedIndex,
  onSelectFrame,
}: Props) {
  if (frames.length === 0) return null;

  return (
    <div className="border-b border-gray-800 bg-gray-900/50 p-3 space-y-3">
      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
        フレームタイムライン
      </h4>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {frames.map((frame, i) => (
          <button
            key={i}
            onClick={() => onSelectFrame(i)}
            className={`flex-shrink-0 rounded-lg overflow-hidden border-2 transition-colors ${
              selectedIndex === i
                ? "border-amber-500 ring-1 ring-amber-500/50"
                : "border-gray-700 hover:border-gray-500"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={frame}
              alt={`Frame ${timestamps[i]}`}
              className="w-28 h-16 object-cover"
            />
            <div className="bg-gray-800 text-center py-0.5">
              <span className="text-xs text-gray-400">{timestamps[i]}</span>
            </div>
          </button>
        ))}
      </div>

      <UnitTracker frames={frames} timestamps={timestamps} />
    </div>
  );
}
