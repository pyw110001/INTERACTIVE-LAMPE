export type LampMode = 'Reading' | 'Work' | 'Relax' | 'Sleep' | 'Ambient';
export type ShellVersion = 'Organic Soft' | 'Parametric Future' | 'Companion Character' | 'Sculptural Home';
export type Emotion = 'Calm' | 'Focus' | 'Relax' | 'Sleep' | 'Joy';

export interface LampState {
  power: boolean;
  brightness: number; // 0-100
  colorTemp: number; // 2700-6500 (Kelvin)
  color: string; // hex color
  mode: LampMode;
  shellVersion: ShellVersion;
  emotion: Emotion;
  transitioning: boolean;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'system';
  text: string;
  timestamp: Date;
}
