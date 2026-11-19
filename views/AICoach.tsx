
import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { chatWithCoach, fetchCoachMessages, clearCoachMessages } from '../services/geminiService';
import { ChatMessage, AnalysisResult } from '../types';
import { Sculpture } from '../components/Three3D';


// Keep response typography explicit: Tailwind's reset removes default list/heading styles.
const coachMarkdownComponents = {
  h1: ({ children }) => <h4 className="mt-5 mb-2 text-lg font-bold text-stone-900 first:mt-0">{children}</h4>,
  h2: ({ children }) => <h4 className="mt-5 mb-2 text-base font-bold text-stone-900 first:mt-0">{children}</h4>,
  h3: ({ children }) => <h5 className="mt-4 mb-2 font-bold text-stone-900 first:mt-0">{children}</h5>,
  h4: ({ children }) => <h5 className="mt-4 mb-2 font-semibold text-stone-900 first:mt-0">{children}</h5>,
  h5: ({ children }) => <h6 className="mt-4 mb-2 font-semibold text-stone-900 first:mt-0">{children}</h6>,
  h6: ({ children }) => <h6 className="mt-4 mb-2 font-semibold text-stone-900 first:mt-0">{children}</h6>,
  p: ({ children }) => <p className="my-3 whitespace-pre-line leading-7 first:mt-0 last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-stone-900">{children}</strong>,
  ul: ({ children }) => <ul className="my-3 list-disc space-y-2 pl-6">{children}</ul>,
  ol: ({ children, start }) => <ol start={start} className="my-3 list-decimal space-y-2 pl-6">{children}</ol>,
  li: ({ children }) => <li className="pl-1 leading-7">{children}</li>,
  blockquote: ({ children }) => <blockquote className="my-4 border-l-4 border-stone-300 bg-stone-50 px-4 py-1 text-stone-600 rounded-r-lg">{children}</blockquote>,
  a: ({ children, href }) => href
    ? <a href={href} target="_blank" rel="noopener noreferrer" className="text-brand-700 underline underline-offset-2 break-words">{children}</a>
    : <span>{children}</span>,
  pre: ({ children }) => <pre className="my-4 max-w-full overflow-x-auto rounded-xl bg-stone-50 border border-line p-4 text-xs leading-6">{children}</pre>,
  code: ({ children }) => <code className="rounded bg-stone-100 px-1 py-0.5 font-mono text-xs">{children}</code>,
  table: ({ children }) => <div className="my-4 max-w-full overflow-x-auto rounded-xl border border-line"><table className="w-full border-collapse text-left text-sm">{children}</table></div>,
  thead: ({ children }) => <thead className="bg-stone-50">{children}</thead>,
  th: ({ children, style }) => <th style={style} className="border-b border-line px-3 py-2 font-semibold text-stone-900">{children}</th>,
  td: ({ children, style }) => <td style={style} className="border-b border-stone-100 px-3 py-2 align-top">{children}</td>,
  hr: () => <hr className="my-5 border-line" />,
  // Do not load arbitrary remote images supplied in an AI response.
  img: ({ alt }) => <span className="italic text-stone-500">{alt || 'Image'}</span>,
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
    <div className="flex flex-col h-[calc(100dvh-190px)] max-w-3xl mx-auto card overflow-hidden fade-up">
      <div className="flex items-center justify-between px-4 h-16 border-b border-line">
        <div className="flex items-center gap-3">
          <Sculpture active={isLoading} zoom={3.6} className="w-11 h-11 rounded-full bg-[#EEF6F1] overflow-hidden" />
          <div>
            <h1 className="font-semibold leading-tight">Coach</h1>
            <p className="text-xs text-stone-500">{isLoading ? 'Thinking…' : 'Knows your saved analyses'}</p>
          </div>
        </div>
        <button onClick={handleClear} className="btn btn-ghost !h-8 text-xs" title="Clear conversation">
          <i className="fas fa-trash-can text-[11px]" /> Clear
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-5 bg-canvas">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`min-w-0 max-w-[92%] sm:max-w-[80%] text-[15px] leading-relaxed break-words ${
              msg.role === 'user'
                ? 'bg-stone-900 text-white px-4 py-2.5 rounded-2xl rounded-br-md'
                : 'bg-white text-stone-700 px-4 py-3 rounded-2xl rounded-bl-md border border-line shadow-card'
            }`}>
              {msg.role === 'assistant' ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={coachMarkdownComponents} skipHtml>
                  {msg.content}
                </ReactMarkdown>
              ) : (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-line px-4 py-3.5 rounded-2xl rounded-bl-md flex gap-1.5 shadow-card">
              {[0, 150, 300].map((d) => (
                <span key={d} className="w-1.5 h-1.5 rounded-full bg-stone-400 animate-bounce" style={{ animationDelay: `${d}ms` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="p-3 sm:p-4 border-t border-line bg-white">
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your results, diet or training…"
            className="input"
            aria-label="Message the coach"
          />
          <button type="submit" disabled={!input.trim() || isLoading} aria-label="Send" className="btn btn-primary !h-11 !w-11 !px-0 shrink-0">
            <i className="fas fa-arrow-up" />
          </button>
        </form>
        <p className="text-[11px] text-center text-stone-400 mt-2">AI can make mistakes. Not a substitute for medical advice.</p>
      </div>
    </div>
  );
};
