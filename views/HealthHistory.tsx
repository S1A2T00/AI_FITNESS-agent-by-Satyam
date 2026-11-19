import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AnalysisResult, AnalysisType } from '../types';
import { TYPE_META, TypeIcon, statusLabel } from './Dashboard';
import { PostureViewer } from '../components/posture/PostureViewer';

interface HealthHistoryProps {
  history: AnalysisResult[];
  onDelete: (id: string) => void;
}

const FILTERS: { id: 'ALL' | AnalysisType; label: string }[] = [
  { id: 'ALL', label: 'All' },
  { id: 'MEDICAL_REPORT', label: 'Lab reports' },
  { id: 'BODY_POSE', label: 'Posture' },
  { id: 'MEDICINE', label: 'Medication' },
];

export const HealthHistory: React.FC<HealthHistoryProps> = ({ history, onDelete }) => {
  const [open, setOpen] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | AnalysisType>('ALL');
  const items = filter === 'ALL' ? history : history.filter((h) => h.type === filter);

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 fade-up">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight">History</h1>
          <p className="text-stone-500 mt-1">Every analysis you've run, newest first.</p>
        </div>
        <div className="inline-flex p-1 rounded-xl bg-stone-100 self-start overflow-x-auto max-w-full">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`h-8 px-3 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                filter === f.id ? 'bg-white text-stone-900 shadow-card' : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </header>

      {items.length > 0 ? (
        <ul className="card divide-y divide-line fade-up">
          {items.map((item) => {
            const expanded = open === item.id;
            const flagged = item.metrics.filter((m) => m.status === 'warning' || m.status === 'critical').length;
            return (
              <li key={item.id}>
                <div className="flex items-start gap-4 px-5 py-4">
                  <TypeIcon type={item.type} />
                  <button
                    onClick={() => setOpen(expanded ? null : item.id)}
                    aria-expanded={expanded}
                    className="min-w-0 flex-grow text-left"
                  >
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <p className="font-medium">{TYPE_META[item.type].label}</p>
                      <span className="text-xs text-stone-400">{new Date(item.timestamp).toLocaleString()}</span>
                      {flagged > 0 && <span className="pill pill-warning"><span className="dot" />{flagged} flagged</span>}
                    </div>
                    <p className={`text-sm text-stone-500 mt-1 ${expanded ? '' : 'line-clamp-1'}`}>{item.summary}</p>
                  </button>
                  <div className="flex items-center shrink-0">
                    <button onClick={() => setOpen(expanded ? null : item.id)} className="btn btn-ghost !h-8 !px-2" aria-label={expanded ? 'Collapse' : 'Expand'}>
                      <i className={`fas fa-chevron-down text-xs transition-transform ${expanded ? 'rotate-180' : ''}`} />
                    </button>
                    <button onClick={() => onDelete(item.id)} className="btn btn-ghost !h-8 !px-2 hover:!text-red-600" title="Delete" aria-label="Delete analysis">
                      <i className="fas fa-trash-can text-xs" />
                    </button>
                  </div>
                </div>

                {expanded && (
                  <div className="px-5 pb-5 sm:pl-[4.25rem] space-y-4">
                    {item.type === 'BODY_POSE' && (item.posture ? (
                      <PostureViewer findings={item.posture} />
                    ) : (
                      <p className="text-xs text-stone-500 rounded-lg bg-stone-50 border border-line px-3 py-2">
                        <i className="fas fa-cube mr-1.5" />Run a new posture analysis to see it on the 3D model.
                      </p>
                    ))}
                    <div className="rounded-xl border border-line divide-y divide-line">
                      {item.metrics.map((m, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm">
                          <span className="font-medium">{m.label}</span>
                          <span className="flex items-center gap-3">
                            <span className="tnum text-stone-600">{m.value}</span>
                            <span className={`pill pill-${m.status}`}><span className="dot" />{statusLabel[m.status] ?? m.status}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                    {item.recommendations.length > 0 && (
                      <ol className="space-y-2">
                        {item.recommendations.map((r, idx) => (
                          <li key={idx} className="flex gap-3 text-sm text-stone-600">
                            <span className="w-5 h-5 rounded-full bg-stone-100 text-stone-600 text-xs flex items-center justify-center shrink-0 tnum">{idx + 1}</span>{r}
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="card px-6 py-16 text-center fade-up">
          <span className="inline-flex w-10 h-10 rounded-full bg-stone-100 text-stone-500 items-center justify-center">
            <i className="fas fa-clock-rotate-left text-sm" />
          </span>
          <h2 className="font-semibold mt-4">{history.length ? 'Nothing in this filter' : 'No analyses yet'}</h2>
          <p className="text-sm text-stone-500 mt-1">Your lab reports, posture scans and medications will show up here.</p>
          <Link to="/analyze" className="btn btn-primary mt-6">New analysis</Link>
        </div>
      )}
    </div>
  );
};
