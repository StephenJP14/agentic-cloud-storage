"use client";
import { useState, useRef, useEffect } from "react";
import { FiX, FiSend } from "react-icons/fi";
import { IoChatboxEllipses } from "react-icons/io5";

interface Message {
    role: "user" | "bot";
    content: string;
    status?: string;
}

export default function Chatbot() {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<Message[]>([]);
    const [isTyping, setIsTyping] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
        }
    }, [messages]);

    const handleSendMessage = async () => {
        if (!input.trim() || isTyping) return;

        const userMsg = input;
        setInput("");
        setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
        setIsTyping(true);
        setMessages((prev) => [...prev, { role: "bot", content: "", status: "Thinking..." }]);

        try {
            const response = await fetch("http://localhost:8000/chat/stream", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: userMsg, thread_id: "session-1" }),
            });

            if (!response.body) return;
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let accumulated = "";

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split("\n");

                for (const line of lines) {
                    if (line.startsWith("data: ")) {
                        const data = JSON.parse(line.slice(6));
                        setMessages((prev) => {
                            const updated = [...prev];
                            const last = updated[updated.length - 1];
                            if (data.status) last.status = data.status;
                            if (data.token) {
                                accumulated += data.token;
                                last.content = accumulated;
                                last.status = undefined;
                            }
                            if (data.done) setIsTyping(false);
                            return updated;
                        });
                    }
                }
            }
        } catch {
            setIsTyping(false);
        }
    };

    return (
        <div className="fixed right-6 md:right-12 bottom-6 md:bottom-12 z-[9999] flex flex-col items-end">
            {/* Window Chat */}
            {isOpen && (
                <div className="mb-4 w-80 sm:w-96 h-[450px] bg-white rounded-2xl shadow-xl flex flex-col border border-gray-100 overflow-hidden transition-all duration-300">
                    {/* Header */}
                    <div className="px-5 py-4 flex items-center justify-between border-b border-gray-50">
                        <span className="font-semibold text-gray-800">Chatbot</span>
                        <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
                            <FiX size={18} />
                        </button>
                    </div>

                    {/* Messages */}
                    <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4 scroll-smooth">
                        {messages.length === 0 && (
                            <p className="text-gray-400 text-xs text-center mt-10">Tanya apapun di sini...</p>
                        )}
                        {messages.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${msg.role === 'user'
                                    ? 'bg-(--z-red) text-white rounded-br-none'
                                    : 'bg-gray-100 text-gray-700 rounded-bl-none'
                                    }`}>
                                    {msg.status && <span className="text-[10px] block opacity-70 animate-pulse">{msg.status}</span>}
                                    {msg.content}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Input */}
                    <div className="p-4 border-t border-gray-50 flex gap-2 items-center bg-white">
                        <input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                            placeholder="Type a message..."
                            className="flex-1 text-sm outline-none bg-transparent"
                        />
                        <button
                            onClick={handleSendMessage}
                            disabled={isTyping}
                            className={`p-2 transition-colors ${input ? 'text-(--z-red)' : 'text-gray-300'}`}
                        >
                            <FiSend size={18} />
                        </button>
                    </div>
                </div>
            )}

            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-16 h-16 bg-(--z-red) text-white rounded-full shadow-lg flex items-center justify-center hover:scale-105 transition-transform active:scale-95"
            >
                {isOpen ? <FiX size={24} /> : <IoChatboxEllipses size={32} />}
            </button>
        </div>
    );
}