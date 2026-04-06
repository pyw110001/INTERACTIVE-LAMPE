import { ChatMessage, Emotion, LampMode, LampState } from '../types';

export interface ChatRequestMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatStreamParams {
  messages: ChatMessage[];
  lampState: LampState;
  signal?: AbortSignal;
  onChunk: (chunk: string) => void;
}

const VALID_MODES: LampMode[] = ['Reading', 'Work', 'Relax', 'Sleep', 'Ambient'];
const VALID_EMOTIONS: Emotion[] = ['Calm', 'Focus', 'Relax', 'Sleep', 'Joy'];
const ACTION_START = '[ACTION:';

function getApiBase() {
  // Electron 生产模式走本地后端
  return import.meta.env.PROD ? 'http://localhost:3001' : '';
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function isHexColor(value: string) {
  return /^#(?:[0-9a-fA-F]{3}){1,2}$/.test(value);
}

function normalizeMode(value: unknown): LampMode | undefined {
  return typeof value === 'string' && VALID_MODES.includes(value as LampMode)
    ? (value as LampMode)
    : undefined;
}

function normalizeEmotion(value: unknown): Emotion | undefined {
  return typeof value === 'string' && VALID_EMOTIONS.includes(value as Emotion)
    ? (value as Emotion)
    : undefined;
}

function extractActionPayload(response: string): { payload?: string; responseText: string } {
  let cursor = 0;
  let latestPayload: string | undefined;
  const rangesToStrip: Array<[number, number]> = [];

  while (cursor < response.length) {
    const start = response.indexOf(ACTION_START, cursor);
    if (start === -1) {
      break;
    }

    const jsonStart = start + ACTION_START.length;
    let depth = 0;
    let inString = false;
    let escaped = false;
    let end = -1;

    for (let index = jsonStart; index < response.length; index += 1) {
      const char = response[index];

      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === '\\') {
        escaped = true;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        continue;
      }

      if (inString) {
        continue;
      }

      if (char === '{') {
        depth += 1;
        continue;
      }

      if (char === '}') {
        depth -= 1;
        continue;
      }

      if (char === ']' && depth === 0) {
        end = index;
        latestPayload = response.slice(jsonStart, index).trim();
        rangesToStrip.push([start, index + 1]);
        break;
      }
    }

    cursor = end === -1 ? jsonStart : end + 1;
  }

  if (rangesToStrip.length === 0) {
    return { responseText: response.trim() };
  }

  let responseText = '';
  let lastIndex = 0;
  for (const [start, end] of rangesToStrip) {
    responseText += response.slice(lastIndex, start);
    lastIndex = end;
  }
  responseText += response.slice(lastIndex);

  return {
    payload: latestPayload,
    responseText: responseText.trim(),
  };
}

export function buildConversationContext(messages: ChatMessage[]): ChatRequestMessage[] {
  const conversational = messages
    .filter((message) => message.sender !== 'system' || message.id !== '1')
    .map((message): ChatRequestMessage => ({
      role: message.sender === 'user' ? 'user' : 'assistant',
      content: message.text,
    }));

  return conversational.slice(-20);
}

export async function streamChatCompletion({
  messages,
  lampState,
  signal,
  onChunk,
}: ChatStreamParams): Promise<string> {
  const payload = {
    messages: buildConversationContext(messages),
    lampState,
  };

  const response = await fetch(`${getApiBase()}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    signal,
  });

  if (!response.ok || !response.body) {
    const errorText = await response.text();
    throw new Error(errorText || 'Chat request failed.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    const chunk = decoder.decode(value, { stream: true });
    fullText += chunk;
    onChunk(chunk);
  }

  const trailing = decoder.decode();
  if (trailing) {
    fullText += trailing;
    onChunk(trailing);
  }

  return fullText;
}

export function parseActionFromResponse(response: string): {
  responseText: string;
  newState: Partial<LampState>;
} {
  const { payload, responseText } = extractActionPayload(response);

  if (!payload) {
    return { responseText, newState: {} };
  }

  try {
    const action = JSON.parse(payload) as Record<string, unknown>;
    const newState: Partial<LampState> = {};

    if (typeof action.brightness === 'number' && Number.isFinite(action.brightness)) {
      newState.brightness = clamp(action.brightness, 0, 100);
      newState.power = action.brightness > 0;
    }

    if (typeof action.colorTemp === 'number' && Number.isFinite(action.colorTemp)) {
      newState.colorTemp = clamp(action.colorTemp, 2700, 6500);
    }

    if (typeof action.color === 'string' && isHexColor(action.color)) {
      newState.color = action.color;
      newState.power = true;
    }

    const mode = normalizeMode(action.mode);
    if (mode) {
      newState.mode = mode;
      newState.power = true;
    }

    const emotion = normalizeEmotion(action.emotion);
    if (emotion) {
      newState.emotion = emotion;
    }

    if (typeof action.power === 'boolean') {
      newState.power = action.power;
    }

    return { responseText, newState };
  } catch {
    return { responseText, newState: {} };
  }
}
