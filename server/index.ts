import dotenv from 'dotenv';
import express from 'express';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ENV_LOCAL_PATH = path.resolve(process.cwd(), 'server/.env.local');
const CHATGLM_BASE_URL = 'https://open.bigmodel.cn/api/paas/v4';
const DEFAULT_CHATGLM_MODEL = 'glm-4.7-flash';

dotenv.config({ path: ENV_LOCAL_PATH, override: true });

const PORT = Number(process.env.PORT || 3001);
const MAX_MESSAGE_COUNT = 20;
const MAX_MESSAGE_LENGTH = 2000;
const MAX_API_KEY_LENGTH = 512;
const SYSTEM_PROMPT =
  '你是一个情绪交互式智能台灯的AI助手，可以根据用户的情绪和需求调节光线。支持的模式：Reading/Work/Relax/Sleep/Ambient。可以调节亮度(0-100)、色温(2700-6500K)、颜色。当用户表达需求时，你需要以JSON格式返回灯的状态变化，并把 JSON 放在 [ACTION:{"brightness":80,"colorTemp":4000,"mode":"Reading","emotion":"Focus"}] 这样的标记中。没有需要改变灯状态时，不要输出 ACTION 标记。';

const app = express();

type Role = 'system' | 'user' | 'assistant';

interface IncomingMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface LampStatePayload {
  power?: boolean;
  brightness?: number;
  colorTemp?: number;
  color?: string;
  mode?: string;
  emotion?: string;
}

function getConfiguredApiKey() {
  const apiKey = process.env.CHATGLM_API_KEY;
  return typeof apiKey === 'string' ? apiKey.trim() : '';
}

function getConfiguredModel() {
  const model = process.env.CHATGLM_MODEL;
  return typeof model === 'string' && model.trim() ? model.trim() : DEFAULT_CHATGLM_MODEL;
}

function sanitizeApiKey(value: unknown) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.replace(/[\u0000-\u001F\u007F\r\n]/g, '').trim();
}

function serializeEnvValue(value: string) {
  return JSON.stringify(value);
}

function upsertEnvValue(content: string, key: string, value: string) {
  const lines = content.length > 0 ? content.split(/\r?\n/) : [];
  const matcher = new RegExp(`^${key}\\s*=`);
  let replaced = false;

  const serialized = serializeEnvValue(value);
  const updatedLines = lines.map((line) => {
    if (matcher.test(line)) {
      replaced = true;
      return `${key}=${serialized}`;
    }

    return line;
  });

  if (!replaced) {
    updatedLines.push(`${key}=${serialized}`);
  }

  return `${updatedLines.filter((line, index, array) => !(index === array.length - 1 && line === '')).join('\n')}\n`;
}

function sanitizeMessageContent(value: unknown) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.replace(/\u0000/g, '').trim().slice(0, MAX_MESSAGE_LENGTH);
}

function normalizeMessages(value: unknown): IncomingMessage[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((message): message is IncomingMessage => typeof message === 'object' && message !== null)
    .map(
      (message): IncomingMessage => ({
        role: message.role === 'assistant' ? 'assistant' : 'user',
        content: sanitizeMessageContent(message.content),
      }),
    )
    .filter((message) => message.content.length > 0)
    .slice(-MAX_MESSAGE_COUNT);
}

function normalizeLampState(value: unknown): LampStatePayload | undefined {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }

  const candidate = value as Record<string, unknown>;
  const lampState: LampStatePayload = {};

  if (typeof candidate.power === 'boolean') {
    lampState.power = candidate.power;
  }

  if (typeof candidate.brightness === 'number' && Number.isFinite(candidate.brightness)) {
    lampState.brightness = Math.min(100, Math.max(0, candidate.brightness));
  }

  if (typeof candidate.colorTemp === 'number' && Number.isFinite(candidate.colorTemp)) {
    lampState.colorTemp = Math.min(6500, Math.max(2700, candidate.colorTemp));
  }

  if (typeof candidate.color === 'string' && /^#(?:[0-9a-fA-F]{3}){1,2}$/.test(candidate.color)) {
    lampState.color = candidate.color;
  }

  if (typeof candidate.mode === 'string') {
    lampState.mode = candidate.mode.slice(0, 32);
  }

  if (typeof candidate.emotion === 'string') {
    lampState.emotion = candidate.emotion.slice(0, 32);
  }

  return Object.keys(lampState).length > 0 ? lampState : undefined;
}

async function readUpstreamError(response: Response) {
  const responseText = await response.text();

  try {
    const parsed = JSON.parse(responseText) as { error?: { message?: string }; message?: string };
    return parsed.error?.message || parsed.message || `ChatGLM request failed (${response.status}).`;
  } catch {
    return responseText || `ChatGLM request failed (${response.status}).`;
  }
}

app.use(express.json({ limit: '32kb' }));

app.get('/api/config/status', (_req, res) => {
  res.json({
    api_key_configured: getConfiguredApiKey().length > 0,
    model: getConfiguredModel(),
  });
});

app.post('/api/config/apikey', (req, res) => {
  const sanitizedKey = sanitizeApiKey(req.body?.api_key);

  if (!sanitizedKey) {
    res.status(400).json({ error: 'API Key 不能为空或格式无效。' });
    return;
  }

  if (sanitizedKey.length > MAX_API_KEY_LENGTH || /\s/.test(sanitizedKey)) {
    res.status(400).json({ error: 'API Key 格式无效。' });
    return;
  }

  try {
    const existingContent = existsSync(ENV_LOCAL_PATH) ? readFileSync(ENV_LOCAL_PATH, 'utf8') : '';
    const nextContent = upsertEnvValue(existingContent, 'CHATGLM_API_KEY', sanitizedKey);

    writeFileSync(ENV_LOCAL_PATH, nextContent, 'utf8');
    process.env.CHATGLM_API_KEY = sanitizedKey;

    res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : '保存 API Key 失败。';
    res.status(500).json({ error: message });
  }
});

app.post('/api/chat', async (req, res) => {
  const apiKey = getConfiguredApiKey();
  if (!apiKey) {
    res.status(500).send('CHATGLM_API_KEY 未配置，请先填写 API Key。');
    return;
  }

  const messages = normalizeMessages(req.body?.messages);
  const lampState = normalizeLampState(req.body?.lampState);

  const stateSummary = lampState
    ? `当前灯状态：power=${lampState.power ?? false}, brightness=${lampState.brightness ?? 0}, colorTemp=${lampState.colorTemp ?? 3500}, color=${lampState.color ?? '#ffffff'}, mode=${lampState.mode ?? 'Relax'}, emotion=${lampState.emotion ?? 'Calm'}。`
    : '';

  const requestMessages: Array<{ role: Role; content: string }> = [
    {
      role: 'system',
      content: `${SYSTEM_PROMPT}${stateSummary ? ` ${stateSummary}` : ''}`,
    },
    ...messages,
  ];

  const abortController = new AbortController();
  const abortUpstream = () => abortController.abort();
  const abortUpstreamOnResponseClose = () => {
    if (!res.writableEnded) {
      abortUpstream();
    }
  };

  req.on('aborted', abortUpstream);
  res.on('close', abortUpstreamOnResponseClose);

  try {
    const upstream = await fetch(`${CHATGLM_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: getConfiguredModel(),
        stream: true,
        messages: requestMessages,
      }),
      signal: abortController.signal,
    });

    if (!upstream.ok || !upstream.body) {
      const errorText = await readUpstreamError(upstream);
      res.status(upstream.status || 502).send(errorText);
      return;
    }

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) {
          continue;
        }

        const payload = trimmed.slice(5).trim();
        if (!payload || payload === '[DONE]') {
          continue;
        }

        try {
          const parsed = JSON.parse(payload) as {
            choices?: Array<{ delta?: { content?: string } }>;
          };
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            res.write(content);
          }
        } catch {
          // Ignore malformed SSE frames from upstream.
        }
      }
    }

    if (buffer.trim().startsWith('data:')) {
      const payload = buffer.trim().slice(5).trim();
      if (payload && payload !== '[DONE]') {
        try {
          const parsed = JSON.parse(payload) as {
            choices?: Array<{ delta?: { content?: string } }>;
          };
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            res.write(content);
          }
        } catch {
          // Ignore trailing malformed SSE frame.
        }
      }
    }

    res.end();
  } catch (error) {
    if (abortController.signal.aborted) {
      if (!res.headersSent) {
        res.status(499).end();
      } else {
        res.end();
      }
      return;
    }

    const message = error instanceof Error ? error.message : 'Unknown server error.';
    if (!res.headersSent) {
      res.status(500).send(message);
      return;
    }
    res.write(`\n${message}`);
    res.end();
  } finally {
    req.off('aborted', abortUpstream);
    res.off('close', abortUpstreamOnResponseClose);
  }
});

app.listen(PORT, () => {
  console.log(`ChatGLM proxy listening on http://127.0.0.1:${PORT}`);
});
