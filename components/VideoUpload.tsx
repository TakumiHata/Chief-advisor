"use client";

import { useState, useRef, useCallback } from "react";

interface Props {
  onFramesExtracted: (frames: string[], timestamps: string[]) => void;
}

export default function VideoUpload({ onFramesExtracted }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const processVideo = useCallback(
    async (file: File) => {
      const validTypes = ["video/mp4", "video/quicktime"];
      if (!validTypes.includes(file.type)) {
        setError("mp4またはmov形式の動画を選択してください");
        return;
      }

      setUploading(true);
      setError("");
      setProgress("アップロード中...");

      const formData = new FormData();
      formData.append("video", file);

      try {
        const res = await fetch("/api/extract-frames", {
          method: "POST",
          body: formData,
        });

        if (!res.ok || !res.body) {
          setError("フレーム抽出に失敗しました");
          setUploading(false);
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
            const data = JSON.parse(line);

            if (data.type === "progress") {
              setProgress(data.message);
            } else if (data.type === "complete") {
              onFramesExtracted(data.frames, data.timestamps);
              setProgress("");
            } else if (data.type === "error") {
              setError(data.message);
            }
          }
        }
      } catch {
        setError("通信エラーが発生しました");
      } finally {
        setUploading(false);
      }
    },
    [onFramesExtracted]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) processVideo(file);
    },
    [processVideo]
  );

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-gray-400">リプレイ動画</h4>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && inputRef.current?.click()}
        className={`rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
          uploading
            ? "border-gray-700 bg-gray-800/50 cursor-wait"
            : dragOver
              ? "border-amber-500 bg-amber-500/10 cursor-pointer"
              : "border-gray-700 hover:border-gray-600 bg-gray-800/50 cursor-pointer"
        }`}
      >
        {uploading ? (
          <div className="space-y-2">
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div className="bg-amber-500 h-2 rounded-full animate-pulse w-2/3" />
            </div>
            <p className="text-sm text-gray-400">{progress}</p>
          </div>
        ) : (
          <div className="space-y-1">
            <p className="text-gray-400">ドラッグ&ドロップ or クリック</p>
            <p className="text-xs text-gray-600">MP4, MOV</p>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="video/mp4,video/quicktime"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) processVideo(file);
          }}
          className="hidden"
        />
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
    </div>
  );
}
