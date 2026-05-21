import React, { useEffect, useRef, useState } from 'react';
import { Header } from './components/Header';
import { Scene } from './components/Scene';
import { ControlPanel } from './components/ControlPanel';
import { ChatPanel } from './components/ChatPanel';
import { StatusBar } from './components/StatusBar';
import { LampState, ChatMessage, SurfaceSettings } from './types';
import { parseActionFromResponse, streamChatCompletion } from './utils/chatLogic';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';


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
  const [surfaceSettings, setSurfaceSettings] = useState<SurfaceSettings>({
    floorColor: '#1a2028',
    floorRoughness: 56,
    floorHighlight: 34,
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
  const [isLoading, setIsLoading] = useState(false);
  const [configChecking, setConfigChecking] = useState(true);
  const [apiKeyConfigured, setApiKeyConfigured] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [apiKeySaving, setApiKeySaving] = useState(false);
  const [apiKeyError, setApiKeyError] = useState('');
  const abortRef = useRef<AbortController | null>(null);

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

    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    let cancelled = false;

    const initializeConfig = async () => {
      try {
        const statusResponse = await fetch('/api/config/status');
        if (!statusResponse.ok) {
          throw new Error(`status check failed: ${statusResponse.status}`);
        }

        const statusData = await statusResponse.json();

        if (cancelled) {
          return;
        }

        if (statusData?.api_key_configured === true) {
          setApiKeyConfigured(true);
        }
      } catch {
        // Ignore here and fall back to modal.
      } finally {
        if (!cancelled) {
          setConfigChecking(false);
        }
      }
    };

    initializeConfig();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleStateChange = (newState: Partial<LampState>) => {
    setState((prev) => ({ ...prev, ...newState }));
  };

  const handleSurfaceChange = (nextSurface: Partial<SurfaceSettings>) => {
    setSurfaceSettings((prev) => ({ ...prev, ...nextSurface }));
  };

  const saveApiKey = async (rawKey: string): Promise<boolean> => {
    const sanitizedKey = rawKey.replace(/[\r\n]/g, '').trim();
    if (!sanitizedKey) {
      setApiKeyError('请输入有效的 ChatGLM API Key。');
      return false;
    }

    setApiKeySaving(true);
    setApiKeyError('');

    try {
      const response = await fetch('/api/config/apikey', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ api_key: sanitizedKey }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.success !== true) {
        setApiKeyError(data.error || `保存失败（${response.status}）`);
        return false;
      }

      setApiKeyConfigured(true);
      return true;
    } catch {
      setApiKeyError('无法连接后端服务，请确认服务已启动。');
      return false;
    } finally {
      setApiKeySaving(false);
    }
  };

  const handleSaveApiKey = async () => {
    await saveApiKey(apiKeyInput);
  };

  const handleSendMessage = async (text: string) => {
    if (isLoading || !apiKeyConfigured) {
      return;
    }

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text,
      timestamp: new Date(),
    };
    const assistantId = `${Date.now()}-assistant`;
    const assistantMsg: ChatMessage = {
      id: assistantId,
      sender: 'system',
      text: '',
      timestamp: new Date(),
      streaming: true,
    };

    const nextMessages = [...messages, userMsg];
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setIsLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;

    let rawResponse = '';

    try {
      rawResponse = await streamChatCompletion({
        messages: nextMessages,
        lampState: state,
        signal: controller.signal,
        onChunk: (chunk) => {
          rawResponse += chunk;
          setMessages((prev) =>
            prev.map((message) =>
              message.id === assistantId ? { ...message, text: rawResponse } : message,
            ),
          );
        },
      });

      const { responseText, newState } = parseActionFromResponse(rawResponse);
      setMessages((prev) =>
        prev.map((message) =>
          message.id === assistantId
            ? {
                ...message,
                text: responseText || '好的，我已经根据你的状态完成调整。',
                streaming: false,
              }
            : message,
        ),
      );

      if (Object.keys(newState).length > 0) {
        handleStateChange(newState);
      }
    } catch (error) {
      const fallback =
        error instanceof Error ? error.message : '暂时无法连接 AI 服务，请稍后再试。';
      setMessages((prev) =>
        prev.map((message) =>
          message.id === assistantId
            ? { ...message, text: fallback, streaming: false }
            : message,
        ),
      );
    } finally {
      abortRef.current = null;
      setIsLoading(false);
    }
  };

  return (
    <div className="app-shell relative h-screen min-h-[100vh] min-h-[100dvh] w-full overflow-hidden bg-[#020202] font-sans text-white selection:bg-white/30">
      {(!apiKeyConfigured || configChecking) && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/55 px-4 backdrop-blur-xl">
          <div className="w-full max-w-xl rounded-[32px] border border-white/12 bg-white/[0.08] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)] ring-1 ring-white/10 backdrop-blur-2xl sm:p-8">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="mb-2 text-xs uppercase tracking-[0.28em] text-white/45">System Access</p>
                <h2 className="text-2xl font-semibold text-white sm:text-[28px]">
                  首次使用需配置 ChatGLM API Key
                </h2>
              </div>
              <div className="rounded-full border border-white/10 bg-white/8 px-3 py-1 font-mono text-xs text-white/55">
                AURA
              </div>
            </div>

            <p className="mb-6 max-w-lg text-sm leading-6 text-white/65">
              API Key 仅会写入 `server/.env.local`。当前服务已配置后，下次打开会自动跳过此弹窗。
            </p>

            <div className="rounded-[24px] border border-white/10 bg-black/20 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <label className="mb-3 block text-sm text-white/72" htmlFor="chatglm-api-key">
                ChatGLM API Key
              </label>
              <input
                id="chatglm-api-key"
                type="password"
                autoFocus
                value={apiKeyInput}
                onChange={(event) => setApiKeyInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !apiKeySaving && apiKeyInput.trim()) {
                    event.preventDefault();
                    void handleSaveApiKey();
                  }
                }}
                placeholder="请输入 ChatGLM API Key"
                className="w-full rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-sm text-white outline-none transition focus:border-white/20 focus:bg-white/12"
                disabled={configChecking || apiKeySaving}
              />
              <div className="mt-3 min-h-5 text-sm text-rose-300">{apiKeyError}</div>
            </div>

            <div className="mt-6 flex items-center justify-between gap-4">
              <p className="text-xs leading-5 text-white/42">
                支持自动回写当前运行中的服务进程，无需手动重启。
              </p>
              <button
                type="button"
                onClick={() => void handleSaveApiKey()}
                disabled={configChecking || apiKeySaving || !apiKeyInput.trim()}
                className="rounded-full border border-white/15 bg-white px-5 py-2.5 text-sm font-medium text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:border-white/8 disabled:bg-white/20 disabled:text-white/45"
              >
                {configChecking ? '检查中...' : apiKeySaving ? '保存中...' : '保存并进入'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-[0.02] mix-blend-overlay">
        <h1 className="whitespace-nowrap font-serif text-[25vw] tracking-tighter">AURA</h1>
      </div>

      <div className="absolute inset-0 z-0 min-h-0">
        <Scene state={state} surface={surfaceSettings} />
      </div>

      <div className="absolute inset-0 z-10 flex flex-col justify-between pointer-events-none">
        <div className="shrink-0 p-4 pointer-events-auto md:p-8">
          <Header />
        </div>

        <div className="relative flex-1 w-full px-4 pointer-events-none md:px-8">
          <button
            onClick={() => { setShowChat(true); if (window.innerWidth < 768) setShowControls(false); }}
            className={`pointer-events-auto absolute left-0 top-1/2 z-30 -translate-y-1/2 rounded-r-2xl border border-l-0 border-white/20 bg-white/10 p-3 text-white/70 shadow-[0_0_20px_rgba(255,255,255,0.05)] backdrop-blur-xl transition-all duration-500 hover:text-white
              ${showChat ? '-translate-x-full opacity-0' : 'translate-x-0 opacity-100'}`}
            title="Show Chat"
          >
            <ChevronRight size={24} />
          </button>

          <div
            className={`pointer-events-auto absolute left-4 top-1/2 z-20 flex h-[85%] max-h-[500px] w-[calc(100%-2rem)] -translate-y-1/2 flex-col transition-all duration-500 ease-out md:left-8 md:w-[360px]
              ${showChat ? 'translate-x-0 opacity-100' : '-translate-x-[120%] opacity-0 pointer-events-none'}`}
          >
            <div className="relative flex h-full w-full flex-col">
              <button
                onClick={() => setShowChat(false)}
                className="absolute -right-3 -top-3 z-50 flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white/70 shadow-xl backdrop-blur-xl transition-colors hover:text-white md:-right-4 md:-top-4 md:h-10 md:w-10"
                title="Hide Chat"
              >
                <X size={16} />
              </button>
              <ChatPanel messages={messages} onSendMessage={handleSendMessage} state={state} isLoading={isLoading} />
            </div>
          </div>

          <button
            onClick={() => { setShowControls(true); if (window.innerWidth < 768) setShowChat(false); }}
            className={`pointer-events-auto absolute right-0 top-1/2 z-30 -translate-y-1/2 rounded-l-2xl border border-r-0 border-white/20 bg-white/10 p-3 text-white/70 shadow-[0_0_20px_rgba(255,255,255,0.05)] backdrop-blur-xl transition-all duration-500 hover:text-white
              ${showControls ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}`}
            title="Show Controls"
          >
            <ChevronLeft size={24} />
          </button>

          <div
            className={`pointer-events-auto absolute right-4 top-1/2 z-20 flex h-[85%] max-h-[600px] w-[calc(100%-2rem)] -translate-y-1/2 flex-col transition-all duration-500 ease-out md:right-8 md:w-[360px]
              ${showControls ? 'translate-x-0 opacity-100' : 'translate-x-[120%] opacity-0 pointer-events-none'}`}
          >
            <div className="relative flex h-full w-full flex-col">
              <button
                onClick={() => setShowControls(false)}
                className="absolute -left-3 -top-3 z-50 flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white/70 shadow-xl backdrop-blur-xl transition-colors hover:text-white md:-left-4 md:-top-4 md:h-10 md:w-10"
                title="Hide Controls"
              >
                <X size={16} />
              </button>
              <ControlPanel
                state={state}
                surface={surfaceSettings}
                onChange={handleStateChange}
                onSurfaceChange={handleSurfaceChange}
              />
            </div>
          </div>
        </div>

        <div className="relative z-30 flex shrink-0 items-center justify-center p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pointer-events-none md:p-8 md:pb-8">
          <div className="pointer-events-auto flex w-full max-w-[95vw] justify-center md:max-w-fit">
            <StatusBar state={state} />
          </div>
        </div>
      </div>
    </div>
  );
}
