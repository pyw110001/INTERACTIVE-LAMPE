import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, LampState } from '../types';
import { Send, Mic } from 'lucide-react';

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  state: LampState;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ messages, onSendMessage, state }) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onSendMessage(input);
      setInput('');
    }
  };

  return (
    <div className="w-full h-full bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2rem] flex flex-col text-white/90 shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-white/5 flex items-center gap-4 bg-white/[0.02]">
        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/80 shadow-inner">
          <span className="text-lg font-serif font-bold italic">Z</span>
        </div>
        <div>
          <h2 className="text-[15px] font-medium tracking-wide">Soul Sync</h2>
          <p className="text-[11px] text-white/40 tracking-wider uppercase mt-0.5">Emotional Intelligence</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6 flex flex-col scrollbar-hide">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col max-w-[85%] ${
              msg.sender === 'user' ? 'self-end items-end' : 'self-start items-start'
            }`}
          >
            <div
              className={`px-5 py-3.5 rounded-2xl text-[13px] leading-relaxed shadow-sm font-light ${
                msg.sender === 'user'
                  ? 'bg-white/20 text-white rounded-br-sm backdrop-blur-md border border-white/10'
                  : 'bg-black/20 text-white/80 rounded-bl-sm border border-white/5 backdrop-blur-md'
              }`}
            >
              {msg.text}
            </div>
            <span className="text-[9px] text-white/30 mt-1.5 px-1 tracking-widest uppercase font-mono">
              {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-black/10 border-t border-white/5">
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <button
            type="button"
            className="absolute left-4 text-white/40 hover:text-white/80 transition-colors"
          >
            <Mic size={18} />
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Share your mood..."
            className="w-full bg-white/5 border border-white/10 rounded-full py-3.5 pl-12 pr-14 text-[13px] text-white placeholder-white/30 focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all shadow-inner font-light"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="absolute right-2 p-2 bg-white/20 rounded-full text-white disabled:opacity-30 disabled:bg-transparent transition-all hover:bg-white/30"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
};
