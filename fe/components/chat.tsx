'use client'
import { useState, useEffect } from 'react';

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

export default function Chat({ isOpen, onClose, fileCount }: ChatProps) {
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [threadId, setThreadId] = useState('');
    const [messages, setMessages] = useState<Message[]>([
        { id: '1', text: "Hello! I'm your Drive Agent. How can I help you with your files today?", sender: 'ai' }
    ]);

    // Initialize a stable thread_id for Redis persistence
    useEffect(() => {
        setThreadId(Math.random().toString(36).substring(7));
    }, []);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userText = input;
        const userMsg: Message = { id: Date.now().toString(), text: userText, sender: 'user' };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await fetch('http://localhost:8000/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userText,
                    thread_id: threadId
                }),
            });

            if (!response.ok) throw new Error('Failed to reach AI Agent');

            const data = await response.json();

            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                text: data.response,
                sender: 'ai'
            };
            setMessages(prev => [...prev, aiMsg]);
        } catch (error) {
            console.error("Chat Error:", error);
            setMessages(prev => [...prev, {
                id: 'error',
                text: "Sorry, I'm having trouble connecting to my brain right now.",
                sender: 'ai'
            }]);
        } finally {
            setIsLoading(false);
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

            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-gray-50/50">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] p-3 rounded-2xl text-sm shadow-sm ${msg.sender === 'user'
                                ? 'bg-blue-600 text-white rounded-tr-none'
                                : 'bg-white border border-gray-200 text-gray-700 rounded-tl-none'
                            }`}>
                            {msg.text}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-white border border-gray-200 p-3 rounded-2xl rounded-tl-none shadow-sm flex gap-1">
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
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