import type { ReactNode } from "react";

type ChatMessageProps = {
  role: "user" | "assistant" | "system";
  content: string;
};

const renderInlineBold = (text: string, keyPrefix: string) => {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, partIndex) => {
    const match = part.match(/^\*\*([^*]+)\*\*$/);
    if (!match) {
      return <span key={`${keyPrefix}-part-${partIndex}`}>{part}</span>;
    }
    return <strong key={`${keyPrefix}-part-${partIndex}`}>{match[1]}</strong>;
  });
};

const renderMessage = (text: string) => {
  const lines = text.split("\n");
  const nodes: ReactNode[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? "";
    const isListItem = /^\s*-\s+/.test(line);

    if (isListItem) {
      const items: string[] = [];
      while (i < lines.length && /^\s*-\s+/.test(lines[i] ?? "")) {
        items.push((lines[i] ?? "").replace(/^\s*-\s+/, ""));
        i += 1;
      }
      i -= 1;
      nodes.push(
        <ul key={`ul-${i}`} className="list-disc pl-5">
          {items.map((item, itemIndex) => (
            <li key={`li-${i}-${itemIndex}`}>
              {renderInlineBold(item, `li-${i}-${itemIndex}`)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    if (line.trim().length === 0) {
      nodes.push(<div key={`spacer-${i}`} className="h-2" />);
      continue;
    }

    nodes.push(
      <p key={`p-${i}`}>{renderInlineBold(line, `p-${i}`)}</p>
    );
  }

  return nodes;
};

export default function ChatMessage({ role, content }: ChatMessageProps) {
  const isUser = role === "user";
  const isSystem = role === "system";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "bg-slate-900 text-white"
            : isSystem
            ? "border border-slate-200 bg-slate-50 text-slate-500"
            : "bg-slate-100 text-slate-700"
        }`}
      >
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
          {isUser ? "Vy" : isSystem ? "Systém" : "Asistent"}
        </p>
        <div className="mt-2 space-y-1">{renderMessage(content)}</div>
      </div>
    </div>
  );
}
