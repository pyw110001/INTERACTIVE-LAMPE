import React from 'react';

export const Header: React.FC = () => {
  return (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-5">
        <div className="w-12 h-12 rounded-full bg-white/5 backdrop-blur-2xl border border-white/10 flex items-center justify-center text-white/80 shadow-[0_0_30px_rgba(255,255,255,0.05)]">
          <span className="text-xl font-serif font-bold italic">Z</span>
        </div>
        <div className="flex flex-col">
          <h1 className="text-3xl font-serif tracking-wide text-white/90 flex items-baseline gap-2">
            Aura <span className="font-sans font-light text-lg italic text-white/50 tracking-normal">Edition</span>
          </h1>
          <p className="text-[10px] text-white/40 font-mono tracking-[0.25em] uppercase mt-1">
            Emotion-Responsive Desktop Companion
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="px-5 py-2.5 rounded-full bg-white/5 backdrop-blur-2xl border border-white/10 text-white/60 text-[10px] font-mono tracking-widest flex items-center gap-3 shadow-lg">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          DIGITAL TWIN SYNC
        </div>
      </div>
    </div>
  );
};
