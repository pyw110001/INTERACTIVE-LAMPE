import React from 'react';
import { LampState, LampMode, ShellVersion } from '../types';
import { Power, Sun, Thermometer, Palette, Box, Activity } from 'lucide-react';

interface ControlPanelProps {
  state: LampState;
  onChange: (newState: Partial<LampState>) => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({ state, onChange }) => {
  const modes: LampMode[] = ['Reading', 'Work', 'Relax', 'Sleep', 'Ambient'];
  const shells: { id: ShellVersion; desc: string }[] = [
    { id: 'Organic Soft', desc: 'Bio-inspired translucent resin' }
  ];

  return (
    <div className="w-full h-full bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-6 flex flex-col gap-6 overflow-y-auto shadow-2xl text-white/90 scrollbar-hide">
      <div className="flex items-center justify-between pb-4 border-b border-white/5">
        <h2 className="text-[15px] font-medium tracking-wide">Environment & Form</h2>
        <button
          onClick={() => onChange({ power: !state.power })}
          className={`p-3 rounded-full transition-all duration-500 ${
            state.power ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.4)]' : 'bg-white/10 text-white/50 hover:bg-white/20'
          }`}
        >
          <Power size={18} />
        </button>
      </div>

      {/* Brightness */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-[13px] text-white/60 font-light">
          <div className="flex items-center gap-3">
            <Sun size={16} className="text-white/40" />
            <span>Luminance</span>
          </div>
          <span className="font-mono">{state.brightness}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={state.brightness}
          onChange={(e) => onChange({ brightness: Number(e.target.value) })}
          disabled={!state.power}
          className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-white transition-opacity"
          style={{ opacity: !state.power ? 0.3 : 1 }}
        />
      </div>

      {/* Color Temp */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-[13px] text-white/60 font-light">
          <div className="flex items-center gap-3">
            <Thermometer size={16} className="text-white/40" />
            <span>Temperature</span>
          </div>
          <span className="font-mono">{state.colorTemp}K</span>
        </div>
        <input
          type="range"
          min="2700"
          max="6500"
          step="100"
          value={state.colorTemp}
          onChange={(e) => onChange({ colorTemp: Number(e.target.value) })}
          disabled={!state.power || state.mode === 'Ambient'}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer transition-opacity"
          style={{
            background: 'linear-gradient(to right, #ffb347, #ffffff, #a2c2e6)',
            opacity: (!state.power || state.mode === 'Ambient') ? 0.3 : 1
          }}
        />
      </div>

      {/* Color Picker (Only active in Ambient mode) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-[13px] text-white/60 font-light">
          <div className="flex items-center gap-3">
            <Palette size={16} className="text-white/40" />
            <span>Aura Color</span>
          </div>
        </div>
        <div className="relative w-full h-10 rounded-xl overflow-hidden border border-white/10 transition-opacity" style={{ opacity: !state.power ? 0.3 : 1 }}>
          <input
            type="color"
            value={state.color}
            onChange={(e) => onChange({ color: e.target.value, mode: 'Ambient' })}
            disabled={!state.power}
            className="absolute -top-2 -left-2 w-[120%] h-[150%] cursor-pointer"
          />
        </div>
      </div>

      {/* Modes */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 text-[13px] text-white/60 font-light">
          <Activity size={16} className="text-white/40" />
          <span>Behavioral Mode</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {modes.map((m) => (
            <button
              key={m}
              onClick={() => onChange({ mode: m })}
              disabled={!state.power}
              className={`py-2.5 px-3 rounded-xl text-[11px] font-medium tracking-wide transition-all duration-300 ${
                state.mode === m && state.power
                  ? 'bg-white text-black shadow-md'
                  : 'bg-white/5 text-white/60 hover:bg-white/10 border border-white/5'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Shell Version */}
      <div className="space-y-4 pt-4 border-t border-white/5">
        <div className="flex items-center gap-3 text-[13px] text-white/60 font-light">
          <Box size={16} className="text-white/40" />
          <span>3D Printed Shell Customization</span>
        </div>
        <div className="flex flex-col gap-2">
          {shells.map((s) => (
            <button
              key={s.id}
              onClick={() => onChange({ shellVersion: s.id })}
              className={`p-3 rounded-xl text-left transition-all duration-300 flex items-center justify-between group ${
                state.shellVersion === s.id
                  ? 'bg-white/10 border border-white/20 shadow-inner'
                  : 'bg-transparent hover:bg-white/5 border border-transparent'
              }`}
            >
              <div className="flex flex-col gap-1">
                <span className={`text-[12px] ${state.shellVersion === s.id ? 'text-white' : 'text-white/70 group-hover:text-white/90'}`}>
                  {s.id}
                </span>
                <span className="text-[9px] text-white/40 font-mono tracking-wide">
                  {s.desc}
                </span>
              </div>
              {state.shellVersion === s.id && (
                <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_5px_#fff]" />
              )}
            </button>
          ))}
        </div>
      </div>
      
      {/* Transition Toggle */}
      <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between text-[13px] font-light">
        <span className="text-white/60">Fluid Transitions</span>
        <button
          onClick={() => onChange({ transitioning: !state.transitioning })}
          className={`w-11 h-6 rounded-full relative transition-colors duration-300 ${
            state.transitioning ? 'bg-white/30' : 'bg-white/10'
          }`}
        >
          <div
            className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform duration-300 shadow-sm ${
              state.transitioning ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
    </div>
  );
};
