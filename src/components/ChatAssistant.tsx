"use client";
import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Flame } from "lucide-react";
import { CampgroundItem } from "../../interface";

type Message = {
  role: "user" | "assistant";
  text: string;
};

export default function ChatAssistant({
  campgrounds,
}: {
  campgrounds: CampgroundItem[];
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: "สวัสดีครับ! ผมชื่อ Ember 🔥 ผมช่วยแนะนำสถานที่แคมป์ให้ได้เลย บอกมาได้เลยว่าอยากได้แบบไหน 🏕️",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll ลงล่างสุดเสมอ
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: userMessage }]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          campgrounds,
          history: messages,
        }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", text: data.reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "ขออภัยครับ เกิดข้อผิดพลาด" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Chat Button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-orange-400 text-white flex items-center justify-center shadow-lg hover:bg-orange-500 transition-all hover:scale-105"
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>

      {/* Chat Window */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-96 h-[520px] bg-[#0f1629] border border-slate-700 rounded-2xl flex flex-col shadow-2xl">
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-orange-400/20 flex items-center justify-center">
                <Flame size={16} className="text-orange-400" />
              </div>
              <div>
                <p className="text-white text-sm font-semibold">Ember</p>
                <p className="text-slate-500 text-xs">Campfire AI Assistant</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded-full bg-orange-400/20 flex items-center justify-center mr-2 flex-shrink-0 mt-1">
                    <Flame size={12} className="text-orange-400" />
                  </div>
                )}
                <div
                  className={`max-w-[78%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-orange-400 text-white rounded-tr-sm"
                      : "bg-[#12172a] text-slate-200 rounded-tl-sm border border-slate-700/50"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="w-7 h-7 rounded-full bg-orange-400/20 flex items-center justify-center mr-2 flex-shrink-0 mt-1">
                  <Flame size={12} className="text-orange-400" />
                </div>
                <div className="bg-[#12172a] border border-slate-700/50 px-4 py-3 rounded-2xl rounded-tl-sm">
                  <div className="flex gap-1">
                    <span
                      className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    />
                    <span
                      className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    />
                    <span
                      className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Disclaimer */}
          <div className="px-4 py-2 text-center">
            <p className="text-slate-600 text-xs">
              Ember is powered by AI. Recommendations may not be 100% accurate.
            </p>
          </div>

          {/* Input */}
          <div className="px-4 pb-4">
            <div className="flex items-center gap-2 bg-[#12172a] border border-slate-700 rounded-xl px-4 py-2 focus-within:border-orange-400 transition-colors">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Ask me anything..."
                className="flex-1 bg-transparent text-slate-100 text-sm focus:outline-none placeholder:text-slate-500"
              />
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="text-orange-400 hover:text-orange-300 transition-colors disabled:opacity-30"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
