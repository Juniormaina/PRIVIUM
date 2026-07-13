import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../providers/auth-provider';
import { supabase } from '../lib/supabase';
import { Bot, Send, User, Sparkles, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/button';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const WELCOME_MESSAGE: ChatMessage = {
  role: 'assistant',
  content:
    "Hello! I'm your PRIVIUM AI assistant. I can help you with treasury management, payroll processing, Avalanche blockchain questions, and platform guidance. How can I help you today?",
};

const SUGGESTIONS = [
  'How do I set up a multi-account treasury structure?',
  'What are best practices for crypto payroll?',
  'Explain Avalanche sub-second finality',
  'How do I set up approval workflows?',
];

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { session } = useAuth();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!isLoading) {
      inputRef.current?.focus();
    }
  }, [isLoading]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    setError(null);
    const userMessage: ChatMessage = { role: 'user', content: trimmed };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('ai-assistant', {
        body: {
          message: trimmed,
          history: messages
            .filter((m) => m !== WELCOME_MESSAGE)
            .map((m) => ({ role: m.role, content: m.content })),
        },
      });

      if (fnError) {
        throw new Error(fnError.message || 'Failed to get response');
      }

      if (data?.reply) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: data.reply },
        ]);
      } else {
        throw new Error(data?.error || 'No response received');
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setError(message);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `I'm sorry, I encountered an error: ${message}. Please try again or check your connection.`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestion = (suggestion: string) => {
    setInput(suggestion);
    inputRef.current?.focus();
  };

  const handleRetry = () => {
    const lastUserMessage = [...messages]
      .reverse()
      .find((m) => m.role === 'user');
    if (lastUserMessage) {
      setMessages((prev) => prev.slice(0, -1)); // Remove the error message
      setInput(lastUserMessage.content);
      setError(null);
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-surface-800 px-6 py-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-privium-500/10 text-privium-400">
          <Bot className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-surface-100">AI Assistant</h1>
          <p className="text-xs text-surface-500">Powered by PRIVIUM Intelligence</p>
        </div>
        {error && (
          <button
            onClick={handleRetry}
            className="ml-auto flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/20 transition-colors"
          >
            <AlertCircle className="h-3.5 w-3.5" />
            Retry
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto max-w-3xl space-y-6">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              {/* Avatar */}
              <div
                className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${
                  msg.role === 'user'
                    ? 'bg-privium-500/10 text-privium-400'
                    : 'bg-surface-800 text-privium-400'
                }`}
              >
                {msg.role === 'user' ? (
                  <User className="h-4 w-4" />
                ) : (
                  <Bot className="h-4 w-4" />
                )}
              </div>

              {/* Bubble */}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-privium-500 text-white rounded-tr-sm'
                    : 'bg-surface-800/80 text-surface-200 rounded-tl-sm border border-surface-700/50'
                }`}
              >
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {msg.content}
                </p>
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-surface-800 text-privium-400">
                <Bot className="h-4 w-4" />
              </div>
              <div className="max-w-[80%] rounded-2xl rounded-tl-sm border border-surface-700/50 bg-surface-800/80 px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-surface-500 [animation-delay:0ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-surface-500 [animation-delay:150ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-surface-500 [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Suggestions (shown when only welcome message) */}
      {messages.length === 1 && !isLoading && (
        <div className="px-6 pb-4">
          <div className="mx-auto max-w-3xl">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium text-surface-500">
              <Sparkles className="h-3.5 w-3.5" />
              Suggested questions
            </div>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => handleSuggestion(suggestion)}
                  className="rounded-full border border-surface-700 bg-surface-800/50 px-3.5 py-1.5 text-xs text-surface-400 transition-all duration-150 hover:border-privium-500/30 hover:bg-privium-500/5 hover:text-privium-400 active:scale-95"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="border-t border-surface-800 px-6 py-4">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-end gap-3 rounded-xl border border-surface-700 bg-surface-800/50 px-4 py-3 transition-colors focus-within:border-privium-500/40 focus-within:bg-surface-800">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about treasury, payroll, or platform features..."
              rows={1}
              className="max-h-32 flex-1 resize-none bg-transparent text-sm text-surface-200 placeholder-surface-500 outline-none"
              disabled={isLoading}
              aria-label="Message input"
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              size="sm"
              className="flex-shrink-0"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="mt-1.5 text-[10px] text-surface-600">
            PRIVIUM AI may produce inaccurate information. Verify critical data in your dashboard.
          </p>
        </div>
      </div>
    </div>
  );
}