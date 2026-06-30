import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, DatabaseZap, MessageSquare, RefreshCw, Send, Sparkles, X } from 'lucide-react';
import { useInternalAi } from '../context/InternalAiContext';

const mcpStatusClassName = (state: string) => {
  if (state === 'ready') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (state === 'missing' || state === 'expired' || state === 'unavailable') {
    return 'bg-amber-50 text-amber-700 border-amber-200';
  }
  return 'bg-slate-100 text-slate-500 border-slate-200';
};

const mcpStatusLabel = (state: string) => {
  if (state === 'ready') return 'PolicyHQ live data ready';
  if (state === 'missing') return 'MCP Authorization missing';
  if (state === 'expired') return 'MCP Authorization expired';
  if (state === 'unavailable') return 'MCP Authorization unavailable';
  return 'Checking MCP availability';
};

export const InternalAiDrawer: React.FC = () => {
  const {
    isOpen,
    isSending,
    messages,
    mcpStatus,
    closeDrawer,
    clearConversation,
    sendMessage,
    contextSnapshot,
  } = useInternalAi();
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isSending, isOpen]);

  const routeLabel = useMemo(() => {
    if (contextSnapshot.pageType === 'policies') return 'Policies';
    if (contextSnapshot.pageType === 'downlines') return 'Downlines';
    if (contextSnapshot.pageType === 'splits') return 'Splits';
    if (contextSnapshot.pageType === 'commissions') return 'Commissions';
    if (contextSnapshot.pageType === 'debts') return 'Debt Recovery';
    if (contextSnapshot.pageType === 'settings') return 'Settings';
    if (contextSnapshot.pageType === 'leaderboard') return 'Leaderboard';
    return 'Overview';
  }, [contextSnapshot.pageType]);

  const handleSubmit = async () => {
    const nextDraft = draft.trim();
    if (!nextDraft || isSending) return;
    setDraft('');
    await sendMessage(nextDraft);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[140] bg-slate-950/30 backdrop-blur-[2px]" onClick={closeDrawer} />
      <aside className="fixed right-0 top-0 z-[150] h-full w-full max-w-[440px] border-l border-slate-200 bg-white shadow-[0_20px_80px_rgba(15,23,42,0.18)]">
        <div className="flex h-full flex-col">
          <div className="border-b border-slate-100 px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-amber-300">
                    <Bot className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-base font-black text-slate-900">PolicyHQ AI</p>
                    <p className="text-xs font-semibold text-slate-500">
                      {routeLabel} | {contextSnapshot.viewingAgentName}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={clearConversation}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900"
                  title="Clear conversation"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={closeDrawer}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900"
                  title="Close AI"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className={`rounded-full border px-3 py-1 text-[11px] font-black ${mcpStatusClassName(mcpStatus.state)}`}>
                {mcpStatusLabel(mcpStatus.state)}
              </span>
              {mcpStatus.expirationDate && (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-500">
                  Expires {mcpStatus.expirationDate}
                </span>
              )}
            </div>

            <p className="mt-3 text-xs font-semibold text-slate-400">
              General chat works without MCP. Live PolicyHQ data needs a valid MCP Authorization in Settings.
            </p>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-3xl px-4 py-3 shadow-sm ${
                    message.role === 'user'
                      ? 'bg-slate-900 text-white'
                      : 'border border-slate-100 bg-slate-50 text-slate-900'
                  }`}
                >
                  <div className="mb-2 flex items-center gap-2">
                    {message.role === 'assistant' ? (
                      <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    ) : (
                      <MessageSquare className="h-3.5 w-3.5 text-slate-300" />
                    )}
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-70">
                      {message.role === 'assistant' ? 'Assistant' : 'You'}
                    </span>
                    {message.usedLiveData && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-700">
                        Live PolicyHQ data
                      </span>
                    )}
                  </div>

                  <p className="whitespace-pre-wrap text-sm font-semibold leading-relaxed">{message.content}</p>

                  {message.toolResults && message.toolResults.length > 0 && (
                    <div className="mt-3 space-y-2 rounded-2xl border border-slate-200 bg-white/70 p-3">
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <DatabaseZap className="h-3.5 w-3.5 text-emerald-500" />
                        Tool activity
                      </div>
                      {message.toolResults.map((toolResult) => (
                        <div key={`${message.id}-${toolResult.tool}`} className="rounded-2xl bg-slate-50 px-3 py-2">
                          <p className="font-mono text-xs font-black text-slate-900">{toolResult.tool}</p>
                          {toolResult.summary && <p className="mt-1 text-xs font-semibold text-slate-500">{toolResult.summary}</p>}
                        </div>
                      ))}
                    </div>
                  )}

                  {message.recoverableError && (
                    <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700">
                      {message.recoverableError}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isSending && (
              <div className="flex justify-start">
                <div className="rounded-3xl border border-slate-100 bg-slate-50 px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Thinking...
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 px-5 py-4">
            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-3">
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    void handleSubmit();
                  }
                }}
                placeholder="Ask about your policies, downlines, team production, or splits..."
                rows={4}
                className="w-full resize-none border-0 bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400"
              />
              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="text-[11px] font-semibold text-slate-400">
                  Current scope: {contextSnapshot.selectedAgentIds.length} selected
                </div>
                <button
                  type="button"
                  onClick={() => void handleSubmit()}
                  disabled={!draft.trim() || isSending}
                  className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-xs font-black text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                >
                  <Send className="h-3.5 w-3.5" />
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
