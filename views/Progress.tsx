import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { AnalysisResult } from '../types';
import { TrendChart } from '../components/charts/TrendChart';
import { PostureCompare } from '../components/posture/PostureCompare';
import { statusLabel } from './Dashboard';
import {
  RANGES, inRange, markerSeries, postureScans, scoreSeries,
  type MarkerSeries, type Range,
} from '../lib/progress';

const fmtDate = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
const fmtNum = (n: number) => (Math.abs(n) >= 100 ? String(Math.round(n)) : String(Math.round(n * 10) / 10));

const Delta: React.FC<{ from: number; to: number; unit: string; since: Date }> = ({ from, to, unit, since }) => {
  const d = to - from;
  if (Math.abs(d) < 1e-9) return <span className="text-xs text-stone-500">No change since {since.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>;
  const pct = from !== 0 ? Math.round((d / Math.abs(from)) * 100) : null;
  // Whether "up" is good depends on the marker, so the delta stays neutral;
  // the status pill says whether the latest value is in range.
  return (
    <span className="text-xs text-stone-600 tnum">
      <i className={`fas ${d > 0 ? 'fa-arrow-up' : 'fa-arrow-down'} text-[10px] mr-1`} />
      {d > 0 ? '+' : '−'}{fmtNum(Math.abs(d))}{unit ? (unit === '%' ? '%' : ` ${unit}`) : ''}{pct !== null ? ` (${d > 0 ? '+' : '−'}${Math.abs(pct)}%)` : ''}
      <span className="text-stone-400"> since {since.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
    </span>
  );
};

const MarkerCard: React.FC<{ s: MarkerSeries; table: boolean }> = ({ s, table }) => {
  const numeric = s.points.filter((p) => p.num !== null);
  const latest = s.points[s.points.length - 1];
  const firstNum = numeric[0];
  const lastNum = numeric[numeric.length - 1];

  return (
    <article className="card p-5 flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-medium truncate" title={s.name}>{s.name}</h3>
          <p className="text-2xl font-semibold mt-1">{latest.raw}</p>
        </div>
        <span className={`pill pill-${latest.status} shrink-0`}><span className="dot" />{statusLabel[latest.status] ?? latest.status}</span>
      </div>
      <div className="mt-1 min-h-[18px]">
        {numeric.length > 1 && <Delta from={firstNum.num!} to={lastNum.num!} unit={s.unit} since={firstNum.date} />}
        {numeric.length <= 1 && <span className="text-xs text-stone-500">{s.points.length} reading · add another report to see a trend</span>}
      </div>

      <div className="mt-4">
        {table ? (
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-stone-500"><th className="font-medium pb-1.5">Date</th><th className="font-medium pb-1.5">Value</th><th className="font-medium pb-1.5 text-right">Status</th></tr></thead>
            <tbody className="divide-y divide-line">
              {[...s.points].reverse().map((p, i) => (
                <tr key={i}>
                  <td className="py-1.5 text-stone-600">{fmtDate(p.date)}</td>
                  <td className="py-1.5 tnum">{p.raw}</td>
                  <td className="py-1.5 text-right text-stone-600">{statusLabel[p.status] ?? p.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : numeric.length ? (
          <TrendChart
            label={s.name}
            unit={s.unit}
            height={130}
            format={fmtNum}
            points={numeric.map((p) => ({ date: p.date, value: p.num!, note: statusLabel[p.status] ?? p.status }))}
          />
        ) : (
          <p className="text-sm text-stone-500">No numeric values to chart.</p>
        )}
      </div>
    </article>
  );
};

export const Progress: React.FC<{ history: AnalysisResult[] }> = ({ history }) => {
  const [range, setRange] = useState<Range>('all');
  const [table, setTable] = useState(false);

  const scoped = useMemo(() => inRange(history, range), [history, range]);
  // Score at each point uses all earlier data, then the chart shows the selected range.
  const scores = useMemo(() => {
    const ids = new Set(scoped.map((h) => h.timestamp.getTime()));
    return scoreSeries(history).filter((p) => ids.has(p.date.getTime()));
  }, [history, scoped]);
  const markers = useMemo(() => markerSeries(scoped), [scoped]);
  const scans = useMemo(() => postureScans(scoped), [scoped]);

  const current = scores[scores.length - 1];
  const first = scores[0];

  if (!history.length) {
    return (
      <div className="space-y-6">
        <h1 className="text-[28px] font-semibold tracking-tight fade-up">Progress</h1>
        <div className="card px-6 py-16 text-center fade-up">
          <span className="inline-flex w-10 h-10 rounded-full bg-brand-50 text-brand-600 items-center justify-center"><i className="fas fa-chart-line text-sm" /></span>
          <h2 className="font-semibold mt-4">Nothing to track yet</h2>
          <p className="text-sm text-stone-500 mt-1 max-w-sm mx-auto">Upload a lab report or a posture scan. Each new one adds a point to your trends.</p>
          <Link to="/analyze" className="btn btn-primary mt-6">New analysis</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="fade-up">
        <h1 className="text-[28px] font-semibold tracking-tight">Progress</h1>
        <p className="text-stone-500 mt-1">How your markers and posture have changed over time.</p>
      </header>

      {/* Filters: one row, above everything they scope */}
      <div className="flex flex-wrap items-center justify-between gap-3 fade-up">
        <div role="radiogroup" aria-label="Date range" className="inline-flex p-1 rounded-xl bg-stone-100">
          {RANGES.map((r) => (
            <button
              key={r.id}
              role="radio"
              aria-checked={range === r.id}
              onClick={() => setRange(r.id)}
              className={`h-8 px-3 rounded-lg text-sm font-medium transition-all ${range === r.id ? 'bg-white text-stone-900 shadow-card' : 'text-stone-500 hover:text-stone-900'}`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <button onClick={() => setTable((t) => !t)} aria-pressed={table} className="btn btn-secondary !h-9">
          <i className={`fas ${table ? 'fa-chart-line' : 'fa-table'} text-xs`} />{table ? 'Chart view' : 'Table view'}
        </button>
      </div>

      {/* Health score over time */}
      <section className="card p-6 fade-up">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-stone-500">Health score</p>
            <p className="text-5xl font-semibold tracking-tight mt-2">{current ? current.score : '—'}</p>
          </div>
          {current && first && scores.length > 1 && (
            <p className={`text-sm font-medium ${current.score >= first.score ? 'text-brand-700' : 'text-amber-700'}`}>
              <i className={`fas ${current.score >= first.score ? 'fa-arrow-up' : 'fa-arrow-down'} text-xs mr-1.5`} />
              {current.score >= first.score ? '+' : '−'}{Math.abs(current.score - first.score)} points since {first.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </p>
          )}
        </div>
        <p className="text-xs text-stone-500 mt-2">From the latest status of each lab marker, minus points for posture issues in your latest scan.</p>
        <div className="mt-5">
          {table ? (
            <table className="w-full text-sm max-w-md">
              <thead><tr className="text-left text-xs text-stone-500"><th className="font-medium pb-1.5">Date</th><th className="font-medium pb-1.5 text-right">Score</th></tr></thead>
              <tbody className="divide-y divide-line">
                {[...scores].reverse().map((p, i) => (
                  <tr key={i}><td className="py-1.5 text-stone-600">{fmtDate(p.date)}</td><td className="py-1.5 text-right tnum">{p.score}</td></tr>
                ))}
              </tbody>
            </table>
          ) : scores.length ? (
            <TrendChart label="Health score" domain={[0, 100]} height={200} format={(v) => String(Math.round(v))} points={scores.map((p) => ({ date: p.date, value: p.score }))} />
          ) : (
            <p className="text-sm text-stone-500">No lab or posture data in this range.</p>
          )}
        </div>
      </section>

      {/* Lab markers */}
      <section className="space-y-3 fade-up">
        <div className="flex items-baseline justify-between">
          <h2 className="font-semibold">Lab markers</h2>
          <span className="text-xs text-stone-500">{markers.length} tracked</span>
        </div>
        {markers.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {markers.map((s) => <MarkerCard key={s.key} s={s} table={table} />)}
          </div>
        ) : (
          <div className="card p-6 text-sm text-stone-500">No lab reports in this range. <Link to="/analyze" className="text-stone-900 underline underline-offset-4">Upload one</Link>.</div>
        )}
      </section>

      {/* Posture */}
      <section className="space-y-3 fade-up">
        <h2 className="font-semibold">Posture</h2>
        {scans.length ? (
          <PostureCompare scans={scans} />
        ) : (
          <div className="card p-6 text-sm text-stone-500">No posture scans with 3D data in this range. <Link to="/analyze" className="text-stone-900 underline underline-offset-4">Run a posture scan</Link>.</div>
        )}
      </section>
    </div>
  );
};
