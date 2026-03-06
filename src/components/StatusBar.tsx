import React from 'react';
import { LampState } from '../types';
import { Power, Sun, Thermometer, Palette, Activity, Box, Heart } from 'lucide-react';

interface StatusBarProps {
  state: LampState;
}

export const StatusBar: React.FC<StatusBarProps> = ({ state }) => {
  return (
    <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-full px-8 py-4 flex items-center gap-8 text-[11px] text-white/50 font-mono tracking-widest shadow-2xl">
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-3">
          <Power size={14} className={state.power ? 'text-white/90 drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]' : 'text-white/20'} />
          <span>{state.power ? 'ON' : 'OFF'}</span>
        </div>
        
        <div className="w-px h-4 bg-white/10" />
        
        <div className="flex items-center gap-3">
          <Sun size={14} className="text-white/40" />
          <span>{state.brightness}%</span>
        </div>
        
        <div className="w-px h-4 bg-white/10" />
        
        <div className="flex items-center gap-3">
          <Thermometer size={14} className="text-white/40" />
          <span>{state.colorTemp}K</span>
        </div>
        
        <div className="w-px h-4 bg-white/10" />
        
        <div className="flex items-center gap-3">
          <Palette size={14} className="text-white/40" />
          <div 
            className="w-3 h-3 rounded-full border border-white/20 shadow-inner" 
            style={{ backgroundColor: state.mode === 'Ambient' ? state.color : '#fff' }}
          />
        </div>
      </div>

      <div className="w-px h-4 bg-white/10" />

      <div className="flex items-center gap-8">
        <div className="flex items-center gap-3">
          <Activity size={14} className="text-white/40" />
          <span className="uppercase">{state.mode}</span>
        </div>
        
        <div className="w-px h-4 bg-white/10" />
        
        <div className="flex items-center gap-3">
          <Box size={14} className="text-white/40" />
          <span className="uppercase truncate max-w-[120px]">{state.shellVersion}</span>
        </div>
        
        <div className="w-px h-4 bg-white/10" />
        
        <div className="flex items-center gap-3 bg-white/5 px-4 py-1.5 rounded-full border border-white/5">
          <Heart size={12} className={state.power ? 'text-white/80' : 'text-white/30'} />
          <span className="uppercase text-white/80">{state.emotion}</span>
        </div>
      </div>
    </div>
  );
};
