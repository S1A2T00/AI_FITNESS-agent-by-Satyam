import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AnalysisResult } from '../types';
import { TYPE_META } from './Dashboard';

interface HealthHistoryProps {
  history: AnalysisResult[];
  onDelete: (id: string) => void;
}

export const HealthHistory: React.FC<HealthHistoryProps> = ({ history, onDelete }) => {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div className="space-y-8">
      <header className="rise">
        <p className="eyebrow">Timeline</p>
        <h1 className="font-display text-4xl md:text-5xl font-extrabold mt-2">Health history<span className="text-vital">.</span></h1>
        <p className="text-mist-500 mt-2">Every analysis, newest first. Saved to your account.</p>
      </header>

      {history.length > 0 ? (
        <ol className="relative space-y-4 before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-px before:bg-gradient-to-b before:from-vital/60 before:via-plasma/30 before:to-transparent">
          {history.map((item, i) => {
            const meta = TYPE_META[item.type];
            const expanded = open === item.id;
            return (
              <li key={item.id} className={`relative pl-14 rise ${i < 4 ? `rise-${i + 1}` : ''}`}>
                <span className={`absolute left-0 top-4 w-10 h-10 rounded-xl border flex items-center justify-center bg-ink-900 ${meta.tone}`}>
                  <i className={`fas ${meta.icon}`} />
                </span>
                <article className="panel panel-hover p-5">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display font-bold text-lg">{meta.label}</h3>
                        <span className="font-mono text-[10px] text-mist-500">{new Date(item.timestamp).toLocaleString()}</span>
                      </div>
                      <p className={`text-sm text-mist-300 mt-2 leading-relaxed ${expanded ? '' : 'line-clamp-2'}`}>{item.summary}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => setOpen(expanded ? null : item.id)} className="btn-ghost !py-2 !px-3 text-xs" aria-expanded={expanded}>
                        {expanded ? 'Collapse' : 'Details'}
                      </button>
                      <button onClick={() => onDelete(item.id)} className="p-2 text-mist-700 hover:text-coral transition-colors" title="Delete record" aria-label="Delete record">
                        <i className="fas fa-trash-can" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {(expanded ? item.metrics : item.metrics.slice(0, 3)).map((m, idx) => (
                      <span key={idx} className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-ink-950/60 border border-white/[0.06] font-mono text-[10px] text-mist-300">
                        <span className={`dot dot-${m.status}`} />
                        {m.label}: <span className="text-mist-100">{m.value}</span>
                      </span>
                    ))}
                    {!expanded && item.metrics.length > 3 && (
                      <span className="font-mono text-[10px] text-mist-500 py-1">+{item.metrics.length - 3} more</span>
                    )}
                  </div>

                  {expanded && item.recommendations.length > 0 && (
                    <ul className="mt-5 space-y-2 border-t border-white/[0.06] pt-4">
                      {item.recommendations.map((r, idx) => (
                        <li key={idx} className="text-sm text-mist-300 flex gap-3">
                          <span className="font-mono text-[10px] text-plasma-300 mt-1">{String(idx + 1).padStart(2, '0')}</span>{r}
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              </li>
            );
          })}
        </ol>
      ) : (
        <div className="panel p-14 text-center rise rise-1">
          <div className="w-16 h-16 rounded-2xl bg-ink-800 border border-white/[0.06] flex items-center justify-center mx-auto text-mist-500">
            <i className="fas fa-clock-rotate-left text-2xl" />
          </div>
          <h2 className="font-display text-2xl font-bold mt-6">Your timeline is empty</h2>
          <p className="text-mist-500 mt-2 max-w-sm mx-auto text-sm">Analyses of reports, posture and medication will appear here in order.</p>
          <Link to="/analyze" className="btn-vital mt-8"><i className="fas fa-plus" /> Start first analysis</Link>
        </div>
      )}
    </div>
  );
};
