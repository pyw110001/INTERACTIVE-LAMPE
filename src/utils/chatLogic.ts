import { LampState, ChatMessage } from '../types';

export function processChatInput(input: string, currentState: LampState): { response: string; newState: Partial<LampState> } {
  const text = input.toLowerCase();
  let newState: Partial<LampState> = {};
  let response = '';

  // Turn on/off
  if (text.includes('开灯') || text.includes('turn on')) {
    newState.power = true;
    response = '好的，已经为您打开台灯。';
  } else if (text.includes('关灯') || text.includes('turn off')) {
    newState.power = false;
    response = '好的，台灯已关闭，祝您有个好梦。';
  }

  // Modes
  if (text.includes('阅读') || text.includes('看书')) {
    newState = { ...newState, power: true, mode: 'Reading', brightness: 80, colorTemp: 4000, emotion: 'Focus' };
    response = '已为您切换到阅读模式，光线清晰护眼，祝您阅读愉快。';
  } else if (text.includes('工作') || text.includes('上班')) {
    newState = { ...newState, power: true, mode: 'Work', brightness: 100, colorTemp: 5500, emotion: 'Focus' };
    response = '已切换到更适合专注的工作光线环境，祝您工作顺利。';
  } else if (text.includes('放松') || text.includes('累') || text.includes('休息')) {
    newState = { ...newState, power: true, mode: 'Relax', brightness: 40, colorTemp: 3000, emotion: 'Relax' };
    response = '好的，我帮你把光线调柔和一些，我们先放松一下。';
  } else if (text.includes('睡觉') || text.includes('晚安') || text.includes('困')) {
    newState = { ...newState, power: true, mode: 'Sleep', brightness: 10, colorTemp: 2700, emotion: 'Sleep' };
    response = '已为您调至助眠暖光，稍后会自动熄灭。晚安。';
  }

  // Brightness
  if (text.includes('亮一点') || text.includes('太暗')) {
    newState.power = true;
    newState.brightness = Math.min(100, currentState.brightness + 20);
    response = '好的，已经调亮了。';
  } else if (text.includes('暗一点') || text.includes('太亮')) {
    newState.power = true;
    newState.brightness = Math.max(10, currentState.brightness - 20);
    response = '好的，光线已经调暗。';
  }

  // Color Temp
  if (text.includes('暖一点') || text.includes('太冷')) {
    newState.power = true;
    newState.colorTemp = Math.max(2700, currentState.colorTemp - 1000);
    response = '好的，光线已经调暖，希望能给您带来温馨的感觉。';
  } else if (text.includes('冷一点') || text.includes('白一点')) {
    newState.power = true;
    newState.colorTemp = Math.min(6500, currentState.colorTemp + 1000);
    response = '好的，光线已经调冷。';
  }

  // Colors
  if (text.includes('蓝色') || text.includes('blue')) {
    newState = { ...newState, power: true, mode: 'Ambient', color: '#4a90e2', emotion: 'Calm' };
    response = '已为您切换到宁静的蓝色氛围光。';
  } else if (text.includes('紫色') || text.includes('purple')) {
    newState = { ...newState, power: true, mode: 'Ambient', color: '#9b59b6', emotion: 'Relax' };
    response = '已为您切换到浪漫的紫色氛围光。';
  } else if (text.includes('粉色') || text.includes('pink')) {
    newState = { ...newState, power: true, mode: 'Ambient', color: '#ff7eb3', emotion: 'Joy' };
    response = '已为您切换到温馨的粉色氛围光。';
  }

  // Shell Versions
  if (text.includes('换个造型') || text.includes('换个外观')) {
    const shells = ['Organic Soft', 'Parametric Future', 'Companion Character', 'Sculptural Home'];
    const currentIndex = shells.indexOf(currentState.shellVersion);
    const nextIndex = (currentIndex + 1) % shells.length;
    newState.shellVersion = shells[nextIndex] as any;
    response = `好的，已为您切换到 ${shells[nextIndex]} 3D打印定制外观。`;
  }

  // Default response if no keywords matched
  if (!response) {
    response = '我听到了。作为您的智能陪伴台灯，我随时准备为您调节最舒适的光线。您可以对我说“把灯调暖一点”或“我要看书了”。';
  }

  return { response, newState };
}
