interface Props {
  role: "user" | "assistant";
  content: string;
}

export default function MessageBubble({ role, content }: Props) {
  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? "bg-amber-600 text-white rounded-br-md"
            : "bg-gray-800 text-gray-200 border border-gray-700 rounded-bl-md"
        }`}
      >
        {content}
      </div>
    </div>
  );
}
