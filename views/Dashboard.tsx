import React from 'react';
import { Link } from 'react-router-dom';
import { AnalysisResult, AnalysisType } from '../types';
import { useAuth } from '../context/AuthContext';
import { TiltCard, VitalOrb } from '../components/Three3D';

export const TYPE_META: Record<AnalysisType, { label: string; icon: string; tone: string }> = {
  BODY_POSE: { label: 'Posture scan', icon: 'fa-person', tone: 'text-coral bg-coral/10 border-coral/20' },
  MEDICAL_REPORT: { label: 'Lab report', icon: 'fa-flask-vial', tone: 'text-vital bg-vital/10 border-vital/20' },
  MEDICINE: { label: 'Medication', icon: 'fa-capsules', tone: 'text-amberx bg-amberx/10 border-amberx/20' },
  GENERAL_CHAT: { label: 'Coach', icon: 'fa-brain', tone: 'text-plasma-300 bg-plasma/10 border-plasma/20' },
};

const StatCard: React.FC<{ label: string; value: number; icon: string; accent: string; delay: string }> = ({
  label, value, icon, accent, delay,
}) => (
  <TiltCard className={`panel panel-hover p-5 rise ${delay}`}>
    <div className="flex items-start justify-between" style={{ transform: 'translateZ(30px)' }}>
      <p className="eyebrow">{label}</p>
      <i className={`fas ${icon} ${accent}`} />
    </div>
    <p className="font-display text-4xl font-bold mt-6 tabular-nums" style={{ transform: 'translateZ(40px)' }}>
      {value.toString().padStart(2, '0')}
    </p>
  </TiltCard>
);

export const Dashboard: React.FC<{ history: AnalysisResult[] }> = ({ history }) => {
  const { user } = useAuth();
  const firstName = (user?.displayName || user?.email?.split('@')[0] || 'there').split(' ')[0];
  const hasData = history.length > 0;
  const latest = history[0];
  const count = (t: AnalysisType) => history.filter((h) => h.type === t).length;

  // Simple demo logic, unchanged from before: more data → higher score.
  const score = hasData ? Math.min(70 + history.length * 2, 98) : 0;
  const completeness = Math.min(history.length * 20, 100);
  const flagged = history.flatMap((h) => h.metrics).filter((m) => m.status === 'warning' || m.status === 'critical').length;

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 rise">
        <div>
          <p className="eyebrow">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          <h1 className="font-display text-4xl md:text-5xl font-extrabold mt-2">
            Hello, {firstName}<span className="text-vital">.</span>
          </h1>
          <p className="text-mist-500 mt-2">
            {hasData ? "Here's what your body has been telling us." : 'Run your first analysis to light up your dashboard.'}
          </p>
        </div>
        <Link to="/analyze" className="btn-vital self-start md:self-auto">
          <i className="fas fa-plus" /> New analysis
        </Link>
      </header>

      {/* Hero: 3D vital orb + score */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <section className="lg:col-span-2 panel relative overflow-hidden rise rise-1 min-h-[340px]">
          <div className="absolute inset-0 bg-[radial-gradient(40rem_20rem_at_80%_50%,rgba(79,240,180,0.10),transparent_70%)]" />
          <div className="relative grid sm:grid-cols-2 h-full">
            <div className="p-7 md:p-9 flex flex-col justify-between gap-8 order-2 sm:order-1">
              <div>
                <p className="eyebrow">Vitalis health score</p>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="font-display text-7xl md:text-8xl font-extrabold tabular-nums glow-text text-vital">
                    {hasData ? score : '--'}
                  </span>
                  <span className="font-mono text-mist-500">/100</span>
                </div>
                <p className="text-mist-300 mt-3 max-w-xs text-sm leading-relaxed">
                  {hasData
                    ? `Based on ${history.length} ${history.length === 1 ? 'record' : 'records'}. More data sharpens the picture.`
                    : 'Upload a lab report, a posture photo or a prescription to calculate your baseline.'}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4 font-mono text-xs">
                <div>
                  <p className="text-mist-500">LAST SYNC</p>
                  <p className="text-mist-100 mt-1">{latest ? latest.timestamp.toLocaleDateString() : '—'}</p>
                </div>
                <div>
                  <p className="text-mist-500">FLAGGED MARKERS</p>
                  <p className={`mt-1 ${flagged ? 'text-amberx' : 'text-mist-100'}`}>{flagged}</p>
                </div>
              </div>
            </div>
            <VitalOrb score={hasData ? score : 0} className="h-64 sm:h-auto order-1 sm:order-2" />
          </div>
        </section>

        <section className="panel p-6 flex flex-col rise rise-2">
          <p className="eyebrow">Profile completeness</p>
          <div className="mt-5 flex items-baseline justify-between">
            <span className="font-display text-4xl font-bold tabular-nums">{completeness}%</span>
            <span className="font-mono text-xs text-mist-500">{history.length}/5 records</span>
          </div>
          <div className="mt-4 h-2 rounded-full bg-ink-700 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-plasma to-vital shadow-[0_0_14px_#4FF0B4] transition-all duration-1000"
              style={{ width: `${completeness}%` }}
            />
          </div>
          <div className="mt-6 space-y-3 text-sm">
            {(['MEDICAL_REPORT', 'BODY_POSE', 'MEDICINE'] as AnalysisType[]).map((t) => (
              <div key={t} className="flex items-center justify-between">
                <span className="flex items-center gap-3 text-mist-300">
                  <span className={`w-8 h-8 rounded-lg border flex items-center justify-center ${TYPE_META[t].tone}`}>
                    <i className={`fas ${TYPE_META[t].icon} text-xs`} />
                  </span>
                  {TYPE_META[t].label}
                </span>
                <span className={`font-mono text-xs ${count(t) ? 'text-vital' : 'text-mist-700'}`}>
                  {count(t) ? '● captured' : '○ missing'}
                </span>
              </div>
            ))}
          </div>
          <Link to="/analyze" className="btn-ghost mt-6 w-full text-sm">Log new data</Link>
        </section>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Analyses" value={history.length} icon="fa-wave-square" accent="text-vital" delay="rise-1" />
        <StatCard label="Lab reports" value={count('MEDICAL_REPORT')} icon="fa-flask-vial" accent="text-vital" delay="rise-2" />
        <StatCard label="Body scans" value={count('BODY_POSE')} icon="fa-person" accent="text-coral" delay="rise-3" />
        <StatCard label="Meds tracked" value={count('MEDICINE')} icon="fa-capsules" accent="text-amberx" delay="rise-4" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
        <section className="md:col-span-3 rise rise-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-xl font-bold">Latest insights</h3>
            {hasData && <Link to="/history" className="font-mono text-xs text-vital hover:underline underline-offset-4">VIEW ALL →</Link>}
          </div>
          <div className="space-y-3">
            {hasData ? (
              history.slice(0, 3).map((item) => (
                <div key={item.id} className="panel panel-hover p-4 flex gap-4 items-start">
                  <span className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${TYPE_META[item.type].tone}`}>
                    <i className={`fas ${TYPE_META[item.type].icon}`} />
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm">{TYPE_META[item.type].label}</p>
                    <p className="text-mist-500 text-sm mt-1 line-clamp-2">{item.summary}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="panel border-dashed p-10 text-center text-mist-500 text-sm">
                Your insights will appear here after your first analysis.
              </div>
            )}
          </div>
        </section>

        <section className="md:col-span-2 rise rise-3">
          <h3 className="font-display text-xl font-bold mb-4">Signal log</h3>
          <div className="panel p-2">
            {hasData ? (
              history.slice(0, 5).map((item) => (
                <div key={item.id} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/[0.03]">
                  <span className="dot dot-normal" />
                  <div className="min-w-0 flex-grow">
                    <p className="text-sm font-medium">{TYPE_META[item.type].label}</p>
                    <p className="font-mono text-[10px] text-mist-500">{item.timestamp.toLocaleString()}</p>
                  </div>
                  <span className="font-mono text-[10px] text-mist-500">{item.metrics.length} pts</span>
                </div>
              ))
            ) : (
              <div className="p-8 text-center">
                <p className="text-mist-500 text-sm">No signals yet.</p>
                <Link to="/analyze" className="font-mono text-xs text-vital mt-2 inline-block">START ANALYSIS →</Link>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
