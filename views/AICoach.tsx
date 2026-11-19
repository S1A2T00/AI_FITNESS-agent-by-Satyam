
import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { chatWithCoach, fetchCoachMessages, clearCoachMessages } from '../services/geminiService';
import { ChatMessage, AnalysisResult } from '../types';
import { VitalOrb } from '../components/Three3D';


// Keep response typography explicit: Tailwind's reset removes default list/heading styles.
const coachMarkdownComponents = {
  h1: ({ children }) => <h4 className="mt-5 mb-2 text-lg font-bold text-mist-100 first:mt-0">{children}</h4>,
  h2: ({ children }) => <h4 className="mt-5 mb-2 text-base font-bold text-mist-100 first:mt-0">{children}</h4>,
  h3: ({ children }) => <h5 className="mt-4 mb-2 font-bold text-mist-100 first:mt-0">{children}</h5>,
  h4: ({ children }) => <h5 className="mt-4 mb-2 font-semibold text-mist-100 first:mt-0">{children}</h5>,
  h5: ({ children }) => <h6 className="mt-4 mb-2 font-semibold text-mist-100 first:mt-0">{children}</h6>,
  h6: ({ children }) => <h6 className="mt-4 mb-2 font-semibold text-mist-100 first:mt-0">{children}</h6>,
  p: ({ children }) => <p className="my-3 whitespace-pre-line leading-7 first:mt-0 last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-mist-100">{children}</strong>,
  ul: ({ children }) => <ul className="my-3 list-disc space-y-2 pl-6">{children}</ul>,
  ol: ({ children, start }) => <ol start={start} className="my-3 list-decimal space-y-2 pl-6">{children}</ol>,
  li: ({ children }) => <li className="pl-1 leading-7">{children}</li>,
  blockquote: ({ children }) => <blockquote className="my-4 border-l-4 border-plasma/60 bg-plasma/10 px-4 py-1 text-mist-300 rounded-r-lg">{children}</blockquote>,
  a: ({ children, href }) => href
    ? <a href={href} target="_blank" rel="noopener noreferrer" className="text-vital underline underline-offset-2 break-words">{children}</a>
    : <span>{children}</span>,
  pre: ({ children }) => <pre className="my-4 max-w-full overflow-x-auto rounded-xl bg-ink-950 border border-white/[0.06] p-4 text-xs leading-6">{children}</pre>,
  code: ({ children }) => <code className="rounded bg-ink-950 text-vital px-1 py-0.5 font-mono text-xs">{children}</code>,
  table: ({ children }) => <div className="my-4 max-w-full overflow-x-auto rounded-xl border border-white/[0.08]"><table className="w-full border-collapse text-left text-sm">{children}</table></div>,
  thead: ({ children }) => <thead className="bg-white/[0.03]">{children}</thead>,
  th: ({ children, style }) => <th style={style} className="border-b border-white/[0.08] px-3 py-2 font-semibold text-mist-100">{children}</th>,
  td: ({ children, style }) => <td style={style} className="border-b border-white/[0.05] px-3 py-2 align-top">{children}</td>,
  hr: () => <hr className="my-5 border-white/[0.08]" />,
  // Do not load arbitrary remote images supplied in an AI response.
  img: ({ alt }) => <span className="italic text-mist-500">{alt || 'Image'}</span>,
} satisfies Components;

const WELCOME: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: "Hi there! I'm your Vitalis AI Coach. How can I help you today? You can ask about your recent analyses or get advice on your health journey.",
  timestamp: new Date()
};

export const AICoach: React.FC<{ history: AnalysisResult[] }> = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);

  // Restore the saved conversation from the database.
  useEffect(() => {
    fetchCoachMessages()
      .then((saved) => setMessages([WELCOME, ...saved]))
      .catch((e) => console.error('Failed to load chat history', e));
  }, []);

  const handleClear = async () => {
    if (!confirm('Delete this conversation? This cannot be undone.')) return;
    try {
      await clearCoachMessages();
      setMessages([WELCOME]);
    } catch (e) {
      alert((e as Error).message);
    }
  };
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const reply = await chatWithCoach(userMessage.content);
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: reply || "I'm sorry, I couldn't process that request.",
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, {
        id: 'err',
        role: 'assistant',
        content: `Sorry, something went wrong: ${(err as Error).message}`,
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-190px)] md:h-[calc(100dvh-96px)] max-w-4xl mx-auto panel overflow-hidden rise">
      {/* Header with live 3D orb */}
      <div className="relative px-5 py-4 border-b border-white/[0.06] flex items-center justify-between overflow-hidden">
        <div className="flex items-center gap-4">
          <VitalOrb active={isLoading} className="w-16 h-16 -my-2 -ml-2" />
          <div>
            <h3 className="font-display text-lg font-bold leading-tight">Vitalis Coach</h3>
            <p className={`font-mono text-[10px] uppercase tracking-widest ${isLoading ? 'text-plasma-300' : 'text-vital'}`}>
              {isLoading ? '● thinking…' : '● online · knows your history'}
            </p>
          </div>
        </div>
        <button onClick={handleClear} title="Clear conversation" aria-label="Clear conversation" className="text-mist-500 hover:text-coral p-2 transition-colors">
          <i className="fas fa-trash-can" />
        </button>
      </div>

      {/* Messages */}
      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`min-w-0 max-w-[95%] sm:max-w-[82%] px-4 py-3 rounded-2xl text-sm leading-relaxed break-words ${
              msg.role === 'user'
                ? 'bg-gradient-to-br from-vital to-vital-600 text-ink-950 font-medium rounded-br-md shadow-[0_10px_30px_-12px_#4FF0B4]'
                : 'bg-ink-850 text-mist-300 rounded-bl-md border border-white/[0.06]'
            }`}>
              {msg.role === 'assistant' ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={coachMarkdownComponents} skipHtml>
                  {msg.content}
                </ReactMarkdown>
              ) : (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              )}
              <p className={`font-mono text-[10px] mt-2 opacity-60 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-ink-850 border border-white/[0.06] px-4 py-3 rounded-2xl rounded-bl-md flex gap-1.5">
              {[0, 150, 300].map((d) => (
                <span key={d} className="w-1.5 h-1.5 rounded-full bg-plasma-300 animate-bounce" style={{ animationDelay: `${d}ms` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 sm:p-4 border-t border-white/[0.06]">
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your results, diet or training…"
            className="field !rounded-2xl"
            aria-label="Message the coach"
          />
          <button type="submit" disabled={!input.trim() || isLoading} aria-label="Send" className="btn-vital !rounded-2xl !px-4 shrink-0">
            <i className="fas fa-arrow-up" />
          </button>
        </form>
        <p className="font-mono text-[10px] text-center text-mist-700 mt-2">AI can make mistakes · not a substitute for a doctor</p>
      </div>
    </div>
  );
};
