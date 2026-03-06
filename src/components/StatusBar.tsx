import React from 'react';
import { LampState } from '../types';
import { Power, Sun, Thermometer, Palette, Activity, Box, Heart } from 'lucide-react';

interface StatusBarProps {
  state: LampState;
}

export const StatusBar: React.FC<StatusBarProps> = ({ state }) => {
  return (
    <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-full px-4 py-3 md:px-8 md:py-4 flex items-center gap-3 md:gap-8 text-[9px] md:text-[11px] text-white/50 font-mono tracking-widest shadow-2xl overflow-x-auto no-scrollbar max-w-full">
      <div className="flex items-center gap-3 md:gap-8 shrink-0">
        <div className="flex items-center gap-1.5 md:gap-3">
          <Power className={`w-3 h-3 md:w-3.5 md:h-3.5 ${state.power ? 'text-white/90 drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]' : 'text-white/20'}`} />
          <span>{state.power ? 'ON' : 'OFF'}</span>
        </div>
        
        <div className="w-px h-3 md:h-4 bg-white/10" />
        
        <div className="flex items-center gap-1.5 md:gap-3">
          <Sun className="w-3 h-3 md:w-3.5 md:h-3.5 text-white/40" />
          <span>{state.brightness}%</span>
        </div>
        
        <div className="w-px h-3 md:h-4 bg-white/10" />
        
        <div className="flex items-center gap-1.5 md:gap-3">
          <Thermometer className="w-3 h-3 md:w-3.5 md:h-3.5 text-white/40" />
          <span>{state.colorTemp}K</span>
        </div>
        
        <div className="w-px h-3 md:h-4 bg-white/10" />
        
        <div className="flex items-center gap-1.5 md:gap-3">
          <Palette className="w-3 h-3 md:w-3.5 md:h-3.5 text-white/40" />
          <div 
            className="w-2 h-2 md:w-3 md:h-3 rounded-full border border-white/20 shadow-inner" 
            style={{ backgroundColor: state.mode === 'Ambient' ? state.color : '#fff' }}
          />
        </div>
      </div>

      <div className="w-px h-3 md:h-4 bg-white/10 shrink-0" />

      <div className="flex items-center gap-3 md:gap-8 shrink-0">
        <div className="flex items-center gap-1.5 md:gap-3">
          <Activity className="w-3 h-3 md:w-3.5 md:h-3.5 text-white/40" />
          <span className="uppercase">{state.mode}</span>
        </div>
        
        <div className="w-px h-3 md:h-4 bg-white/10" />
        
        <div className="flex items-center gap-1.5 md:gap-3">
          <Box className="w-3 h-3 md:w-3.5 md:h-3.5 text-white/40" />
          <span className="uppercase truncate max-w-[80px] md:max-w-[120px]">{state.shellVersion}</span>
        </div>
        
        <div className="w-px h-3 md:h-4 bg-white/10" />
        
        <div className="flex items-center gap-1.5 md:gap-3 bg-white/5 px-2 py-1 md:px-4 md:py-1.5 rounded-full border border-white/5">
          <Heart className={`w-2.5 h-2.5 md:w-3 md:h-3 ${state.power ? 'text-white/80' : 'text-white/30'}`} />
          <span className="uppercase text-white/80">{state.emotion}</span>
        </div>
      </div>
    </div>
  );
};
