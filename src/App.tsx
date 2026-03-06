import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Scene } from './components/Scene';
import { ControlPanel } from './components/ControlPanel';
import { ChatPanel } from './components/ChatPanel';
import { StatusBar } from './components/StatusBar';
import { LampState, ChatMessage } from './types';
import { processChatInput } from './utils/chatLogic';
import { MessageSquare, Settings2, X, ChevronRight, ChevronLeft } from 'lucide-react';

export default function App() {
  const [state, setState] = useState<LampState>({
    power: true,
    brightness: 60,
    colorTemp: 3500,
    color: '#ffffff',
    mode: 'Relax',
    shellVersion: 'Organic Soft',
    emotion: 'Calm',
    transitioning: true,
  });

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'system',
      text: '你好，我是你的情绪交互式智能台灯。我可以根据你的心情和活动调整光线。试试对我说：“我要开始工作了”或者“我今天有点累”。',
      timestamp: new Date(),
    },
  ]);

  const [showChat, setShowChat] = useState(true);
  const [showControls, setShowControls] = useState(true);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setShowChat(true);
        setShowControls(true);
      } else {
        setShowChat(false);
        setShowControls(false);
      }
    };
    
    // Initial check
    handleResize();
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleStateChange = (newState: Partial<LampState>) => {
    setState((prev) => ({ ...prev, ...newState }));
  };

  const handleSendMessage = (text: string) => {
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);

    // Process input and generate response
    setTimeout(() => {
      const { response, newState } = processChatInput(text, state);
      
      if (Object.keys(newState).length > 0) {
        handleStateChange(newState);
      }

      const sysMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'system',
        text: response,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, sysMsg]);
    }, 800);
  };

  return (
    <div className="fixed inset-0 bg-[#020202] text-white overflow-hidden font-sans selection:bg-white/30 flex flex-col">
      {/* Background Typographic Watermark */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0 opacity-[0.02] mix-blend-overlay">
        <h1 className="text-[25vw] font-serif whitespace-nowrap tracking-tighter">AURA</h1>
      </div>

      {/* 3D Scene as absolute background */}
      <div className="absolute inset-0 z-0">
        <Scene state={state} />
      </div>

      {/* UI Layer */}
      <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between">
        
        {/* Header Area */}
        <div className="p-4 md:p-8 pointer-events-auto shrink-0">
          <Header />
        </div>
        
        {/* Middle Area (Panels) */}
        <div className="flex-1 relative w-full px-4 md:px-8 pointer-events-none">
          
          {/* Left Edge Show Button */}
          <button
            onClick={() => { setShowChat(true); if (window.innerWidth < 768) setShowControls(false); }}
            className={`pointer-events-auto absolute left-0 top-1/2 -translate-y-1/2 z-30 p-3 bg-white/10 backdrop-blur-xl border border-white/20 border-l-0 rounded-r-2xl text-white/70 hover:text-white transition-all duration-500 shadow-[0_0_20px_rgba(255,255,255,0.05)]
              ${showChat ? '-translate-x-full opacity-0' : 'translate-x-0 opacity-100'}`}
            title="Show Chat"
          >
            <ChevronRight size={24} />
          </button>

          {/* Left Panel (Chat) */}
          <div 
            className={`pointer-events-auto absolute top-1/2 -translate-y-1/2 left-4 md:left-8 w-[calc(100%-2rem)] md:w-[360px] h-[85%] max-h-[500px] transition-all duration-500 ease-out z-20 flex flex-col
              ${showChat ? 'translate-x-0 opacity-100' : '-translate-x-[120%] opacity-0 pointer-events-none'}`}
          >
            <div className="relative w-full h-full flex flex-col">
              {/* Hide Button */}
              <button 
                onClick={() => setShowChat(false)}
                className="absolute -top-3 -right-3 md:-top-4 md:-right-4 z-50 w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors shadow-xl"
                title="Hide Chat"
              >
                <X size={16} />
              </button>
              <ChatPanel messages={messages} onSendMessage={handleSendMessage} state={state} />
            </div>
          </div>
          
          {/* Right Edge Show Button */}
          <button
            onClick={() => { setShowControls(true); if (window.innerWidth < 768) setShowChat(false); }}
            className={`pointer-events-auto absolute right-0 top-1/2 -translate-y-1/2 z-30 p-3 bg-white/10 backdrop-blur-xl border border-white/20 border-r-0 rounded-l-2xl text-white/70 hover:text-white transition-all duration-500 shadow-[0_0_20px_rgba(255,255,255,0.05)]
              ${showControls ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}`}
            title="Show Controls"
          >
            <ChevronLeft size={24} />
          </button>

          {/* Right Panel (Controls) */}
          <div 
            className={`pointer-events-auto absolute top-1/2 -translate-y-1/2 right-4 md:right-8 w-[calc(100%-2rem)] md:w-[360px] h-[85%] max-h-[600px] transition-all duration-500 ease-out z-20 flex flex-col
              ${showControls ? 'translate-x-0 opacity-100' : 'translate-x-[120%] opacity-0 pointer-events-none'}`}
          >
            <div className="relative w-full h-full flex flex-col">
              {/* Hide Button */}
              <button 
                onClick={() => setShowControls(false)}
                className="absolute -top-3 -left-3 md:-top-4 md:-left-4 z-50 w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors shadow-xl"
                title="Hide Controls"
              >
                <X size={16} />
              </button>
              <ControlPanel state={state} onChange={handleStateChange} />
            </div>
          </div>
        </div>
        
        {/* Bottom Area (Status Bar) */}
        <div className="p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:pb-8 md:p-8 shrink-0 pointer-events-none flex justify-center items-center relative z-30">
          {/* Status Bar */}
          <div className="pointer-events-auto flex justify-center w-full max-w-[95vw] md:max-w-fit">
            <StatusBar state={state} />
          </div>
        </div>
      </div>
    </div>
  );
}
