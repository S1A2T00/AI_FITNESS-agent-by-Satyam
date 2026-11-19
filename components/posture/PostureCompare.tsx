import React, { Suspense, lazy, useState } from 'react';
import { ISSUES } from './library';
import { WebGLBoundary } from './PostureViewer';
import { postureChanges, type PostureScan, type Trend } from '../../lib/progress';

const PostureScene = lazy(() => import('./Mannequin').then((m) => ({ default: m.PostureScene })));

const TREND: Record<Trend, { label: string; icon: string; cls: string }> = {
  improved: { label: 'Improved', icon: 'fa-arrow-trend-down', cls: 'text-brand-700' },
  resolved: { label: 'Resolved', icon: 'fa-check', cls: 'text-brand-700' },
  same: { label: 'No change', icon: 'fa-minus', cls: 'text-stone-500' },
  worse: { label: 'Worse', icon: 'fa-arrow-trend-up', cls: 'text-amber-700' },
  new: { label: 'New', icon: 'fa-circle-plus', cls: 'text-amber-700' },
};

const Sev: React.FC<{ s?: 'mild' | 'moderate' | 'severe' }> = ({ s }) =>
  s ? (
    <span className={`pill ${s === 'severe' ? 'pill-critical' : 'pill-warning'} capitalize`}><span className="dot" />{s}</span>
  ) : (
    <span className="pill pill-normal"><span className="dot" />None</span>
  );

const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

/** Compare the first and latest posture scan on the 3D mannequin. */
export const PostureCompare: React.FC<{ scans: PostureScan[] }> = ({ scans }) => {
  const first = scans[0];
  const latest = scans[scans.length - 1];
  const [which, setWhich] = useState<'then' | 'now'>('now');
  const shown = which === 'then' ? first : latest;
  const changes = scans.length > 1 ? postureChanges(first, latest) : [];

  return (
    <div className="card overflow-hidden grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <div className="relative bg-gradient-to-b from-[#F6F5F2] to-[#ECEAE5] min-h-[380px]">
        {scans.length > 1 && (
          <div role="radiogroup" aria-label="Compare scans" className="absolute top-3 left-3 z-10 inline-flex p-0.5 rounded-lg bg-white/70 backdrop-blur ring-1 ring-black/5">
            {(['then', 'now'] as const).map((w) => (
              <button
                key={w}
                role="radio"
                aria-checked={which === w}
                onClick={() => setWhich(w)}
                className={`h-7 px-3 rounded-md text-xs font-medium ${which === w ? 'bg-white text-stone-900 shadow-card' : 'text-stone-500 hover:text-stone-900'}`}
              >
                {w === 'then' ? `Then · ${first.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : 'Now'}
              </button>
            ))}
          </div>
        )}
        <WebGLBoundary>
          <Suspense fallback={<div className="absolute inset-0 flex items-center justify-center"><div className="w-5 h-5 rounded-full border-2 border-stone-300 border-t-stone-900 animate-spin" /></div>}>
            <div className="absolute inset-0">
              <PostureScene findings={shown.findings} mode="issue" view="side" showLabels={false} />
            </div>
          </Suspense>
        </WebGLBoundary>
        <p className="absolute bottom-3 left-3 text-[11px] text-stone-500">Scan from {fmt(shown.date)}</p>
      </div>

      <div className="border-t lg:border-t-0 lg:border-l border-line">
        {scans.length > 1 ? (
          <>
            <div className="px-5 h-14 flex items-center justify-between border-b border-line">
              <h3 className="font-semibold">Since your first scan</h3>
              <span className="text-xs text-stone-500">{scans.length} scans</span>
            </div>
            {changes.length ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-stone-500">
                    <th className="font-medium px-5 py-2.5">Issue</th>
                    <th className="font-medium px-2 py-2.5">Then</th>
                    <th className="font-medium px-2 py-2.5">Now</th>
                    <th className="font-medium px-5 py-2.5 text-right">Change</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {changes.map((c) => (
                    <tr key={c.issue}>
                      <td className="px-5 py-3 font-medium">{ISSUES[c.issue].label}</td>
                      <td className="px-2 py-3"><Sev s={c.before?.severity} /></td>
                      <td className="px-2 py-3"><Sev s={c.after?.severity} /></td>
                      <td className={`px-5 py-3 text-right font-medium whitespace-nowrap ${TREND[c.trend].cls}`}>
                        <i className={`fas ${TREND[c.trend].icon} text-xs mr-1.5`} />{TREND[c.trend].label}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="p-5 text-sm text-stone-500">No posture issues in either scan.</p>
            )}
          </>
        ) : (
          <div className="p-6">
            <h3 className="font-semibold">Your baseline</h3>
            <p className="text-sm text-stone-500 mt-1">This is your first posture scan with 3D data. Scan again in a few weeks to see what changed.</p>
            <ul className="mt-4 space-y-2">
              {latest.findings.length ? latest.findings.map((f) => (
                <li key={f.issue} className="flex items-center justify-between text-sm">
                  <span>{ISSUES[f.issue].label}</span><Sev s={f.severity} />
                </li>
              )) : <li className="text-sm text-stone-500">No posture issues found.</li>}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
