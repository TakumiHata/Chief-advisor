"use client";

import { useState, useRef, useCallback } from "react";

interface Props {
  onScreenshotChange: (base64: string | null) => void;
  screenshot: string | null;
}

export default function ScreenshotUpload({ onScreenshotChange, screenshot }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = () => {
        onScreenshotChange(reader.result as string);
      };
      reader.readAsDataURL(file);
    },
    [onScreenshotChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-gray-400">相手村のスクリーンショット</h4>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`rounded-lg border-2 border-dashed p-6 text-center cursor-pointer transition-colors ${
          dragOver
            ? "border-amber-500 bg-amber-500/10"
            : "border-gray-700 hover:border-gray-600 bg-gray-800/50"
        }`}
      >
        {screenshot ? (
          <div className="space-y-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={screenshot}
              alt="アップロードされたスクリーンショット"
              className="max-h-40 mx-auto rounded"
            />
            <p className="text-xs text-gray-500">クリックで変更</p>
          </div>
        ) : (
          <div className="space-y-1">
            <p className="text-gray-400">ドラッグ&ドロップ or クリック</p>
            <p className="text-xs text-gray-600">PNG, JPG, WebP</p>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
      {screenshot && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onScreenshotChange(null);
          }}
          className="text-xs text-red-400 hover:text-red-300"
        >
          画像を削除
        </button>
      )}
    </div>
  );
}
