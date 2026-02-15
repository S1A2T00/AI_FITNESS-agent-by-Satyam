
import React, { useState, useRef, useEffect } from 'react';
import { chatWithCoach } from '../services/geminiService';
import { ChatMessage, AnalysisResult } from '../types';

export const AICoach: React.FC<{ history: AnalysisResult[] }> = ({ history }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hi there! I'm your Vitalis AI Coach. How can I help you today? You can ask about your recent analyses or get advice on your health journey.",
      timestamp: new Date()
    }
  ]);
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
      // Build context based on actual analysis history
      let healthContext = "No prior health analyses performed.";
      if (history.length > 0) {
        healthContext = history.map(item => 
          `- ${item.type} (${item.timestamp.toLocaleDateString()}): ${item.summary}`
        ).join('\n');
      }
      
      const reply = await chatWithCoach(input, messages.map(m => ({ role: m.role, content: m.content })), healthContext);
      
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
        content: "Sorry, I encountered an error connecting to my core intelligence. Please check your API key.",
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-160px)] max-w-4xl mx-auto glass rounded-3xl border border-slate-200 overflow-hidden shadow-xl animate-in fade-in zoom-in-95 duration-500">
      {/* Header */}
      <div className="p-4 bg-white border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white relative">
            <i className="fas fa-user-doctor"></i>
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
          </div>
          <div>
            <h3 className="font-bold text-slate-900 leading-tight">Vitalis Health Coach</h3>
            <p className="text-[10px] text-green-600 font-bold uppercase tracking-wider">Online • Ready to help</p>
          </div>
        </div>
        <button className="text-slate-400 hover:text-slate-600"><i className="fas fa-ellipsis-vertical text-lg"></i></button>
      </div>

      {/* Messages */}
      <div className="flex-grow overflow-y-auto p-6 space-y-6 bg-slate-50/50">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-4 rounded-2xl shadow-sm text-sm leading-relaxed ${
              msg.role === 'user' 
                ? 'bg-blue-600 text-white rounded-tr-none' 
                : 'bg-white text-slate-700 rounded-tl-none border border-slate-100'
            }`}>
              {msg.content}
              <p className={`text-[10px] mt-2 font-medium opacity-60 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce delay-75"></div>
                <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce delay-150"></div>
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-slate-100">
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your metrics, diet, or workout..."
            className="flex-grow px-5 py-3 rounded-2xl bg-slate-100 border-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="w-12 h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-all disabled:opacity-50"
          >
            <i className="fas fa-paper-plane"></i>
          </button>
        </form>
        <p className="text-[10px] text-center text-slate-400 mt-2">
          AI can make mistakes. Consider checking important health information.
        </p>
      </div>
    </div>
  );
};
