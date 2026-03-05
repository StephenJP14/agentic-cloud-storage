'use client'
import { useState, useEffect, useRef } from 'react';

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'ai';
}

interface ChatProps {
    isOpen: boolean;
    onClose: () => void;
    fileCount: number;
}

const STATUS_LABELS: Record<string, string> = {
    router: 'Routing query…',
    expand_query: 'Expanding query…',
    search: 'Searching documents…',
    grade: 'Evaluating relevance…',
    generating: 'Generating answer…',
};

export default function Chat({ isOpen, onClose, fileCount }: ChatProps) {
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [statusText, setStatusText] = useState('');
    const [threadId, setThreadId] = useState('');
    const [messages, setMessages] = useState<Message[]>([
        { id: '1', text: "Hello! I'm your Drive Agent. How can I help you with your files today?", sender: 'ai' }
    ]);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setThreadId(Math.random().toString(36).substring(7));
    }, []);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, [messages, statusText]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userText = input;
        const userMsgId = crypto.randomUUID();
        const aiMsgId = crypto.randomUUID();
        let aiMessageCreated = false;
        let accumulated = '';

        setMessages(prev => [...prev, { id: userMsgId, text: userText, sender: 'user' }]);
        setInput('');
        setIsLoading(true);
        setStatusText('Processing…');

        try {
            const response = await fetch('http://localhost:8000/chat/stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userText, thread_id: threadId }),
            });

            if (!response.ok || !response.body) throw new Error('Failed to reach AI Agent');

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop()!; // keep last (possibly incomplete) line

                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    try {
                        const data = JSON.parse(line.slice(6));

                        // Pipeline status update
                        if (data.status) {
                            setStatusText(STATUS_LABELS[data.status] || 'Processing…');
                        }

                        // Streamed answer token
                        if (data.token) {
                            if (!aiMessageCreated) {
                                setMessages(prev => [...prev, { id: aiMsgId, text: data.token, sender: 'ai' }]);
                                accumulated = data.token;
                                aiMessageCreated = true;
                                setStatusText(''); // hide status once tokens flow
                            } else {
                                accumulated += data.token;
                                setMessages(prev =>
                                    prev.map(msg => msg.id === aiMsgId ? { ...msg, text: accumulated } : msg)
                                );
                            }
                        }

                        // Stream finished
                        if (data.done) {
                            if (!aiMessageCreated) {
                                setMessages(prev => [...prev, { id: aiMsgId, text: 'No relevant information found.', sender: 'ai' }]);
                            }
                        }

                        // Error from backend
                        if (data.error) {
                            throw new Error(data.error);
                        }
                    } catch (parseErr) {
                        // Ignore malformed SSE lines
                    }
                }
            }
        } catch (error) {
            console.error("Chat Error:", error);
            if (!aiMessageCreated) {
                setMessages(prev => [...prev, {
                    id: 'error-' + Date.now(),
                    text: "Sorry, I'm having trouble connecting right now.",
                    sender: 'ai'
                }]);
            }
        } finally {
            setIsLoading(false);
            setStatusText('');
        }
    };

    return (
        <aside
            className={`transition-all duration-300 ease-in-out border-l border-gray-200 bg-gray-50 flex flex-col h-full
                ${isOpen ? 'w-85 opacity-100' : 'w-0 opacity-0 overflow-hidden border-none'}`}
        >
            <div className="p-4 border-b border-gray-200 bg-white flex justify-between items-center flex-shrink-0">
                <div className="flex items-center gap-2">
                    <span className={`flex h-2 w-2 rounded-full ${isLoading ? 'bg-yellow-400 animate-pulse' : 'bg-green-500'}`}></span>
                    <span className="font-bold text-gray-800">Drive Agent</span>
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">✕</button>
            </div>

            <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-4 bg-gray-50/50">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] p-3 rounded-2xl text-sm shadow-sm whitespace-pre-wrap ${msg.sender === 'user'
                                ? 'bg-blue-600 text-white rounded-tr-none'
                                : 'bg-white border border-gray-200 text-gray-700 rounded-tl-none'
                            }`}>
                            {msg.text}
                        </div>
                    </div>
                ))}
                {isLoading && statusText && (
                    <div className="flex justify-start">
                        <div className="bg-white border border-gray-200 p-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                            <div className="flex gap-1">
                                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                            </div>
                            <span className="text-xs text-gray-400">{statusText}</span>
                        </div>
                    </div>
                )}
            </div>

            <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-gray-200">
                <div className="relative flex items-center gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        disabled={isLoading}
                        placeholder={isLoading ? "Agent is thinking..." : "Ask your files..."}
                        className="flex-1 pl-4 pr-10 py-2.5 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all disabled:opacity-50"
                    />
                    <button
                        type="submit"
                        className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                        disabled={!input.trim() || isLoading}
                    >
                        {isLoading ? '...' : '→'}
                    </button>
                </div>
            </form>
        </aside>
    );
}