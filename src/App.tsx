import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Scene } from './components/Scene';
import { ControlPanel } from './components/ControlPanel';
import { ChatPanel } from './components/ChatPanel';
import { StatusBar } from './components/StatusBar';
import { LampState, ChatMessage } from './types';
import { processChatInput } from './utils/chatLogic';
import { MessageSquare, Settings2, X } from 'lucide-react';

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
    <div className="h-[100dvh] w-screen bg-[#020202] text-white overflow-hidden font-sans selection:bg-white/30 relative">
      {/* Background Typographic Watermark */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0 opacity-[0.02] mix-blend-overlay">
        <h1 className="text-[25vw] font-serif whitespace-nowrap tracking-tighter">AURA</h1>
      </div>

      {/* 3D Scene as absolute background */}
      <div className="absolute inset-0 z-0">
        <Scene state={state} />
      </div>

      {/* UI Layer */}
      <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-4 md:p-8">
        <div className="pointer-events-auto">
          <Header />
        </div>
        
        <div className="flex-1 relative mt-4 mb-20 md:mt-8 md:mb-16 pointer-events-none">
          {/* Left Panel (Chat) */}
          <div 
            className={`pointer-events-auto absolute bottom-0 left-0 h-[400px] md:h-[500px] w-full md:w-[360px] transition-all duration-500 ease-out z-20
              ${showChat ? 'translate-y-0 md:translate-x-0 opacity-100' : 'translate-y-8 md:translate-y-0 md:-translate-x-8 opacity-0 pointer-events-none'}`}
          >
            <div className="relative w-full h-full">
              {/* Mobile Close Button */}
              <button 
                onClick={() => setShowChat(false)}
                className="md:hidden absolute -top-12 right-0 w-10 h-10 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white/70 hover:text-white"
              >
                <X size={20} />
              </button>
              <ChatPanel messages={messages} onSendMessage={handleSendMessage} state={state} />
            </div>
          </div>
          
          {/* Right Panel (Controls) */}
          <div 
            className={`pointer-events-auto absolute bottom-0 right-0 h-[500px] md:h-[600px] w-full md:w-[360px] transition-all duration-500 ease-out z-20
              ${showControls ? 'translate-y-0 md:translate-x-0 opacity-100' : 'translate-y-8 md:translate-y-0 md:translate-x-8 opacity-0 pointer-events-none'}`}
          >
            <div className="relative w-full h-full">
              {/* Mobile Close Button */}
              <button 
                onClick={() => setShowControls(false)}
                className="md:hidden absolute -top-12 left-0 w-10 h-10 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white/70 hover:text-white"
              >
                <X size={20} />
              </button>
              <ControlPanel state={state} onChange={handleStateChange} />
            </div>
          </div>
        </div>
        
        <div className="pointer-events-auto absolute bottom-6 left-1/2 -translate-x-1/2 z-10 w-full px-4 md:w-auto md:px-0 flex justify-between md:justify-center items-center">
          {/* Mobile Toggle Chat Button */}
          <button 
            onClick={() => { setShowChat(!showChat); if (!showChat) setShowControls(false); }}
            className={`md:hidden w-12 h-12 rounded-full backdrop-blur-xl border flex items-center justify-center transition-colors
              ${showChat ? 'bg-white/20 border-white/30 text-white' : 'bg-white/5 border-white/10 text-white/60'}`}
          >
            <MessageSquare size={20} />
          </button>

          <StatusBar state={state} />

          {/* Mobile Toggle Controls Button */}
          <button 
            onClick={() => { setShowControls(!showControls); if (!showControls) setShowChat(false); }}
            className={`md:hidden w-12 h-12 rounded-full backdrop-blur-xl border flex items-center justify-center transition-colors
              ${showControls ? 'bg-white/20 border-white/30 text-white' : 'bg-white/5 border-white/10 text-white/60'}`}
          >
            <Settings2 size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
