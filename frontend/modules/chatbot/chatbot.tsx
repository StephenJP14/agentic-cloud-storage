"use client";
import { useState, useRef, useEffect } from "react";
import { FiX, FiSend } from "react-icons/fi";
import { IoChatboxEllipses } from "react-icons/io5";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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
    const [threadId, setThreadId] = useState<string>("");

    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let currentSessionId = sessionStorage.getItem("zyrex_chat_session");

        if (!currentSessionId) {
            currentSessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
            // Simpan ke storage browser agar tidak hilang saat halaman di-refresh
            sessionStorage.setItem("zyrex_chat_session", currentSessionId);
        }

        setThreadId(currentSessionId);
        console.log(`🎟️ [ACTIVE SESSION] Thread ID: ${currentSessionId}`);
    }, []);

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
                body: JSON.stringify({ 
                    message: userMsg, 
                    thread_id: threadId
                }),
            });

            if (!response.body) return;
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let currentContent = "";

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split("\n");

                for (const line of lines) {
                    if (!line.trim() || !line.startsWith("data: ")) continue;

                    try {
                        const data = JSON.parse(line.slice(6));

                        if (data.token) {
                            currentContent += data.token;

                            setMessages((prev) => {
                                const updated = [...prev];
                                const lastIndex = updated.length - 1;

                                updated[lastIndex] = {
                                    ...updated[lastIndex],
                                    content: currentContent,
                                    status: undefined
                                };

                                return updated;
                            });
                        }

                        if (data.status) {
                            setMessages((prev) => {
                                const updated = [...prev];
                                const lastIndex = updated.length - 1;
                                updated[lastIndex] = { ...updated[lastIndex], status: data.status };
                                return updated;
                            });
                        }

                        if (data.done) setIsTyping(false);
                    } catch (e) {
                        console.error("Error parsing stream line", e);
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
                <div className="mb-4 w-90 sm:w-96 h-[650px] bg-white rounded-2xl shadow-xl flex flex-col border border-gray-100 overflow-hidden transition-all duration-300">
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
                                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed overflow-x-auto ${msg.role === 'user'
                                    ? 'bg-(--z-red) text-white rounded-br-none'
                                    : 'bg-gray-100 text-gray-700 rounded-bl-none'
                                    }`}>
                                    {msg.status && <span className="text-[10px] block opacity-70 animate-pulse">{msg.status}</span>}

                                    {msg.role === 'bot' ? (
                                        <div className="markdown-body space-y-2 [&>ul]:list-disc [&>ul]:pl-4 [&>ol]:list-decimal [&>ol]:pl-4 [&>table]:w-full [&>table]:border-collapse [&_th]:border [&_th]:p-1 [&_td]:border [&_td]:p-1">
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                {msg.content}
                                            </ReactMarkdown>
                                        </div>
                                    ) : (
                                        <span className="whitespace-pre-wrap">{msg.content}</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Input */}
                    <div className="p-4 border-t border-gray-50 flex gap-2 items-center bg-white">
                        <textarea
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