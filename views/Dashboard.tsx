import React from 'react';
import { Link } from 'react-router-dom';
import { AnalysisResult, AnalysisType } from '../types';
import { useAuth } from '../context/AuthContext';
import { Sculpture } from '../components/Three3D';

export const TYPE_META: Record<AnalysisType, { label: string; icon: string; tone: string }> = {
  MEDICAL_REPORT: { label: 'Lab report', icon: 'fa-flask-vial', tone: 'bg-brand-50 text-brand-700' },
  BODY_POSE: { label: 'Posture scan', icon: 'fa-person', tone: 'bg-indigo-50 text-indigo-600' },
  MEDICINE: { label: 'Medication', icon: 'fa-capsules', tone: 'bg-amber-50 text-amber-700' },
  GENERAL_CHAT: { label: 'Coach', icon: 'fa-comment-medical', tone: 'bg-stone-100 text-stone-600' },
};

export const TypeIcon: React.FC<{ type: AnalysisType; size?: string }> = ({ type, size = 'w-9 h-9' }) => (
  <span className={`${size} rounded-lg flex items-center justify-center shrink-0 ${TYPE_META[type].tone}`}>
    <i className={`fas ${TYPE_META[type].icon} text-[13px]`} />
  </span>
);

export const statusLabel: Record<string, string> = { normal: 'Normal', warning: 'Watch', critical: 'Attention', neutral: 'Info' };

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
};

const relative = (d: Date) => {
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 60) return `${Math.max(mins, 1)}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return days < 7 ? `${days}d ago` : d.toLocaleDateString();
};

export const Dashboard: React.FC<{ history: AnalysisResult[] }> = ({ history }) => {
  const { user } = useAuth();
  const firstName = (user?.displayName || user?.email?.split('@')[0] || '').split(' ')[0];
  const hasData = history.length > 0;
  const count = (t: AnalysisType) => history.filter((h) => h.type === t).length;

  // Same simple scoring as before: more data → higher score (capped).
  const score = hasData ? Math.min(70 + history.length * 2, 98) : 0;
  const flagged = history
    .flatMap((h) => h.metrics.map((m) => ({ ...m, type: h.type, at: h.timestamp, id: h.id })))
    .filter((m) => m.status === 'warning' || m.status === 'critical')
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 fade-up">
        <div>
          <p className="text-sm text-stone-500">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          <h1 className="text-[28px] font-semibold tracking-tight mt-1">
            {greeting()}{firstName ? `, ${firstName}` : ''}
          </h1>
        </div>
        <Link to="/analyze" className="btn btn-primary self-start sm:self-auto">
          <i className="fas fa-plus text-xs" /> New analysis
        </Link>
      </header>

      {/* Score */}
      <section className="card overflow-hidden grid md:grid-cols-5 fade-up">
        <div className="md:col-span-3 p-6 sm:p-8 flex flex-col">
          <p className="text-sm font-medium text-stone-500">Health score</p>
          <div className="mt-3 flex items-baseline gap-3">
            <span className="text-6xl sm:text-7xl font-semibold tracking-tight tnum">{hasData ? score : '—'}</span>
            {hasData && <span className="text-stone-400 tnum">/ 100</span>}
          </div>
          <p className="mt-3 text-[15px] text-stone-600 max-w-sm leading-relaxed">
            {hasData
              ? `Based on ${history.length} ${history.length === 1 ? 'analysis' : 'analyses'}. Adding more data makes it more accurate.`
              : 'Run your first analysis — a lab report, a posture photo or a prescription — to get your baseline.'}
          </p>

          <dl className="mt-auto pt-8 grid grid-cols-3 gap-4 text-sm">
            <div>
              <dt className="text-stone-500">Last analysis</dt>
              <dd className="mt-1 font-medium">{hasData ? relative(history[0].timestamp) : '—'}</dd>
            </div>
            <div>
              <dt className="text-stone-500">Flagged</dt>
              <dd className={`mt-1 font-medium tnum ${flagged.length ? 'text-amber-700' : ''}`}>{flagged.length}</dd>
            </div>
            <div>
              <dt className="text-stone-500">Profile</dt>
              <dd className="mt-1 font-medium tnum">{Math.min(history.length * 20, 100)}%</dd>
            </div>
          </dl>
        </div>
        <div className="md:col-span-2 relative min-h-[260px] bg-gradient-to-b from-[#F1F7F3] to-[#E6F0EA] md:border-l border-t md:border-t-0 border-line">
          <Sculpture score={hasData ? score : 0} className="absolute inset-0" />
        </div>
      </section>

      {/* Stat strip */}
      <section className="card !bg-line overflow-hidden grid grid-cols-2 md:grid-cols-4 gap-px fade-up">
        {[
          { label: 'Analyses', value: history.length },
          { label: 'Lab reports', value: count('MEDICAL_REPORT') },
          { label: 'Posture scans', value: count('BODY_POSE') },
          { label: 'Medications', value: count('MEDICINE') },
        ].map((s) => (
          <div key={s.label} className="p-5 bg-white">
            <p className="text-sm text-stone-500">{s.label}</p>
            <p className="mt-2 text-2xl font-semibold tnum">{s.value}</p>
          </div>
        ))}
      </section>

      <div className="grid lg:grid-cols-5 gap-6">
        <section className="lg:col-span-3 card fade-up">
          <div className="flex items-center justify-between px-5 h-14 border-b border-line">
            <h2 className="font-semibold">Recent analyses</h2>
            {hasData && <Link to="/history" className="text-sm text-stone-500 hover:text-stone-900">View all</Link>}
          </div>
          {hasData ? (
            <ul className="divide-y divide-line">
              {history.slice(0, 4).map((item) => (
                <li key={item.id} className="flex items-start gap-3 px-5 py-4">
                  <TypeIcon type={item.type} />
                  <div className="min-w-0 flex-grow">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium">{TYPE_META[item.type].label}</p>
                      <span className="text-xs text-stone-400 shrink-0">{relative(item.timestamp)}</span>
                    </div>
                    <p className="text-sm text-stone-500 mt-0.5 line-clamp-1">{item.summary}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-5 py-12 text-center">
              <p className="text-sm text-stone-500">No analyses yet.</p>
              <Link to="/analyze" className="btn btn-secondary mt-4">Start an analysis</Link>
            </div>
          )}
        </section>

        <section className="lg:col-span-2 card fade-up">
          <div className="flex items-center px-5 h-14 border-b border-line">
            <h2 className="font-semibold">Needs attention</h2>
          </div>
          {flagged.length ? (
            <ul className="divide-y divide-line">
              {flagged.map((m, i) => (
                <li key={`${m.id}-${i}`} className="px-5 py-3.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{m.label}</p>
                    <p className="text-xs text-stone-500 tnum">{m.value} · {TYPE_META[m.type].label}</p>
                  </div>
                  <span className={`pill pill-${m.status} shrink-0`}><span className="dot" />{statusLabel[m.status]}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-5 py-12 text-center">
              <span className="inline-flex w-9 h-9 rounded-full bg-brand-50 text-brand-600 items-center justify-center"><i className="fas fa-check text-sm" /></span>
              <p className="text-sm text-stone-500 mt-3">Nothing flagged right now.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
