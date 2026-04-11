"use client";

import { useState, useRef, useEffect } from "react";
import MessageBubble from "./MessageBubble";
import { PlayerData } from "./PlayerInput";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Props {
  playerData: PlayerData | null;
  frames: string[];
  selectedFrameIndex: number | null;
}

export default function ChatWindow({
  playerData,
  frames,
  selectedFrameIndex,
}: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  const handleSend = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || loading) return;

    const userMessage: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    if (!overrideText) setInput("");
    setLoading(true);
    setStreamingContent("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerData,
          frames,
          selectedFrameIndex,
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          userMessage: text,
        }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({ error: "不明なエラー" }));
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `エラー: ${data.error}` },
        ]);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          const data = JSON.parse(line);

          if (data.type === "text") {
            accumulated += data.content;
            setStreamingContent(accumulated);
          } else if (data.type === "done") {
            setMessages((prev) => [
              ...prev,
              { role: "assistant", content: accumulated },
            ]);
            setStreamingContent("");
          } else if (data.type === "error") {
            setMessages((prev) => [
              ...prev,
              { role: "assistant", content: `エラー: ${data.message}` },
            ]);
            setStreamingContent("");
          }
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "通信エラーが発生しました" },
      ]);
      setStreamingContent("");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const askAboutFrame = () => {
    if (selectedFrameIndex === null) return;
    handleSend(
      `フレーム #${selectedFrameIndex + 1} のこの場面について分析してください。良かった点と改善点を教えてください。`
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && !streamingContent && (
          <div className="flex items-center justify-center h-full text-gray-600">
            <p>メッセージを入力してAIに相談しましょう</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <MessageBubble key={i} role={msg.role} content={msg.content} />
        ))}
        {streamingContent && (
          <MessageBubble role="assistant" content={streamingContent} />
        )}
        {loading && !streamingContent && (
          <div className="flex justify-start">
            <div className="bg-gray-800 border border-gray-700 rounded-2xl rounded-bl-md px-4 py-3 text-sm text-gray-400">
              考え中...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-gray-800 p-4 space-y-2">
        {selectedFrameIndex !== null && frames.length > 0 && (
          <button
            onClick={askAboutFrame}
            disabled={loading}
            className="w-full rounded-lg bg-gray-800 border border-amber-600/50 px-4 py-2 text-sm text-amber-400 hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            このフレームについて聞く (#{selectedFrameIndex + 1})
          </button>
        )}
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="攻め方を相談..."
            rows={2}
            className="flex-1 rounded-lg bg-gray-800 border border-gray-700 px-4 py-2 text-gray-100 placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <button
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            className="self-end rounded-lg bg-amber-600 px-6 py-2 font-semibold text-white hover:bg-amber-500 disabled:opacity-50 transition-colors"
          >
            送信
          </button>
        </div>
        {frames.length > 0 && (
          <p className="text-xs text-gray-500">
            {frames.length}フレームが添付されています
            {selectedFrameIndex !== null &&
              ` (フレーム #${selectedFrameIndex + 1} を選択中)`}
          </p>
        )}
      </div>
    </div>
  );
}
