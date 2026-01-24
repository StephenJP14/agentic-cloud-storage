'use client'
import { useState } from 'react';

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
    const [messages, setMessages] = useState<Message[]>([
        { id: '1', text: "Hello! I'm your Drive Agent. How can I help you with your files today?", sender: 'ai' }
    ]);

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        // Add user message
        const userMsg: Message = { id: Date.now().toString(), text: input, sender: 'user' };
        setMessages(prev => [...prev, userMsg]);
        setInput('');

        // Mock AI response (We will connect this to FastAPI later)
        setTimeout(() => {
            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                text: `I see you have ${fileCount} files. I'm currently being connected to the brain!`,
                sender: 'ai'
            };
            setMessages(prev => [...prev, aiMsg]);
        }, 1000);
    };

    return (
        <aside 
            className={`transition-all duration-300 ease-in-out border-l border-gray-200 bg-gray-50 flex flex-col h-full
                ${isOpen ? 'w-85 opacity-100' : 'w-0 opacity-0 overflow-hidden border-none'}`}
        >
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 bg-white flex justify-between items-center flex-shrink-0">
                <div className="flex items-center gap-2">
                    <span className="flex h-2 w-2 rounded-full bg-green-500"></span>
                    <span className="font-bold text-gray-800">Drive Agent</span>
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">✕</button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-gray-50/50">
                {messages.map((msg) => (
                    <div 
                        key={msg.id} 
                        className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div className={`max-w-[85%] p-3 rounded-2xl text-sm shadow-sm ${
                            msg.sender === 'user' 
                                ? 'bg-blue-600 text-white rounded-tr-none' 
                                : 'bg-white border border-gray-200 text-gray-700 rounded-tl-none'
                        }`}>
                            {msg.text}
                        </div>
                    </div>
                ))}
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-gray-200">
                <div className="relative flex items-center gap-2">
                    <input 
                        type="text" 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask your files..." 
                        className="flex-1 pl-4 pr-10 py-2.5 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                    />
                    <button 
                        type="submit"
                        className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                        disabled={!input.trim()}
                    >
                        →
                    </button>
                </div>
            </form>
        </aside>
    );
}