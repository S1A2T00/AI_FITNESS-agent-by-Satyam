import React, { Suspense, lazy, useState } from 'react';
import type { PostureFinding } from '../../types';
import { EXERCISES, ISSUES, bestView } from './library';
import type { ViewerMode } from './Mannequin';

const PostureScene = lazy(() => import('./Mannequin').then((m) => ({ default: m.PostureScene })));

const SEVERITY_PILL: Record<PostureFinding['severity'], string> = {
  mild: 'pill-warning',
  moderate: 'pill-warning',
  severe: 'pill-critical',
};

class WebGLBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="absolute inset-0 flex items-center justify-center text-sm text-stone-500 p-6 text-center">
        3D view isn't available in this browser.
      </div>
    ) : (
      this.props.children
    );
  }
}

const Segmented = <T extends string>({ value, options, onChange, label }: {
  value: T; options: { id: T; label: string }[]; onChange: (v: T) => void; label: string;
}) => (
  <div role="radiogroup" aria-label={label} className="inline-flex p-0.5 rounded-lg bg-stone-100">
    {options.map((o) => (
      <button
        key={o.id}
        role="radio"
        aria-checked={value === o.id}
        onClick={() => onChange(o.id)}
        className={`h-7 px-2.5 rounded-md text-xs font-medium transition-all ${
          value === o.id ? 'bg-white text-stone-900 shadow-card' : 'text-stone-500 hover:text-stone-900'
        }`}
      >
        {o.label}
      </button>
    ))}
  </div>
);

/** 3D mannequin showing the user's posture issues, the corrected posture, and how to fix it. */
export const PostureViewer: React.FC<{ findings: PostureFinding[] }> = ({ findings }) => {
  const [mode, setMode] = useState<ViewerMode>('issue');
  const [view, setView] = useState<'side' | 'front'>(bestView(findings));
  const [selected, setSelected] = useState(findings[0]?.issue);
  const [exerciseId, setExerciseId] = useState<string | undefined>();

  const active = findings.find((f) => f.issue === selected) ?? findings[0];
  const exercise = exerciseId ? EXERCISES[exerciseId] : undefined;

  const play = (id: string) => {
    setExerciseId(id);
    setMode('exercise');
    setView(EXERCISES[id].view);
  };
  const stop = () => {
    setExerciseId(undefined);
    setMode('issue');
    setView(bestView(findings));
  };

  if (!findings.length) {
    return (
      <div className="rounded-xl border border-line p-5 flex items-center gap-3 text-sm">
        <span className="w-8 h-8 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center"><i className="fas fa-check text-xs" /></span>
        No clear postural deviations were detected in these photos.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-line overflow-hidden grid lg:grid-cols-[1.1fr_1fr]">
      {/* 3D stage */}
      <div className="relative bg-gradient-to-b from-[#F6F5F2] to-[#ECEAE5] min-h-[420px] lg:min-h-[520px]">
        <div className="absolute top-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2">
          {mode === 'exercise' ? (
            <button onClick={stop} className="btn btn-secondary !h-8 text-xs"><i className="fas fa-arrow-left text-[10px]" /> Back to my posture</button>
          ) : (
            <Segmented<ViewerMode>
              label="Posture"
              value={mode}
              onChange={setMode}
              options={[{ id: 'issue', label: 'Your posture' }, { id: 'corrected', label: 'Corrected' }]}
            />
          )}
          <Segmented<'side' | 'front'> label="Camera" value={view} onChange={setView} options={[{ id: 'side', label: 'Side' }, { id: 'front', label: 'Front' }]} />
        </div>

        <WebGLBoundary>
          <Suspense fallback={<div className="absolute inset-0 flex items-center justify-center"><div className="w-5 h-5 rounded-full border-2 border-stone-300 border-t-stone-900 animate-spin" /></div>}>
            <div className="absolute inset-0">
              <PostureScene findings={findings} mode={mode} exerciseId={exerciseId} view={view} />
            </div>
          </Suspense>
        </WebGLBoundary>

        <div className="absolute bottom-3 left-3 right-3 z-10 flex items-center justify-between text-[11px] text-stone-500">
          {mode !== 'exercise' ? (
            <span className="flex items-center gap-2"><span className="inline-block w-4 border-t border-dashed border-brand-600" /> Ideal alignment</span>
          ) : <span />}
          <span className="flex items-center gap-3">
            {mode === 'issue' && <span className="flex items-center gap-1.5"><span className="dot text-amber-500" />Affected area</span>}
            {mode !== 'issue' && <span className="flex items-center gap-1.5"><span className="dot text-brand-500" />{mode === 'exercise' ? 'Target area' : 'Aligned'}</span>}
          </span>
        </div>
      </div>

      {/* Explanation */}
      <div className="bg-white border-t lg:border-t-0 lg:border-l border-line flex flex-col">
        {exercise ? (
          <div className="p-5 sm:p-6 fade-up">
            <p className="text-xs font-medium text-brand-700">Now playing</p>
            <h3 className="text-lg font-semibold mt-1">{exercise.name}</h3>
            <p className="text-sm text-stone-500 mt-0.5 tnum">{exercise.reps}</p>
            <ol className="mt-5 space-y-3">
              {exercise.steps.map((s, i) => (
                <li key={i} className="flex gap-3 text-sm text-stone-700">
                  <span className="w-5 h-5 rounded-full bg-stone-900 text-white text-[11px] flex items-center justify-center shrink-0 tnum">{i + 1}</span>
                  {s}
                </li>
              ))}
            </ol>
            <p className="text-xs text-stone-500 mt-6">Move slowly and stop if anything hurts. Ask a physiotherapist if you have pain or an injury.</p>
          </div>
        ) : (
          <>
            <div className="p-5 sm:p-6 border-b border-line">
              <h3 className="font-semibold">What we found</h3>
              <ul className="mt-3 space-y-1">
                {findings.map((f) => (
                  <li key={f.issue}>
                    <button
                      onClick={() => setSelected(f.issue)}
                      aria-pressed={active?.issue === f.issue}
                      className={`w-full text-left rounded-lg px-3 py-2.5 flex items-center justify-between gap-3 transition-colors ${
                        active?.issue === f.issue ? 'bg-stone-100' : 'hover:bg-stone-50'
                      }`}
                    >
                      <span className="text-sm font-medium">{ISSUES[f.issue].label}</span>
                      <span className={`pill ${SEVERITY_PILL[f.severity]} capitalize shrink-0`}><span className="dot" />{f.severity}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {active && (
              <div className="p-5 sm:p-6 flex-1">
                <p className="text-sm text-stone-700 leading-relaxed">{ISSUES[active.issue].what}</p>
                <p className="text-sm text-stone-500 mt-2">{active.note || ISSUES[active.issue].look}</p>

                <h4 className="text-sm font-semibold mt-6">How to fix it</h4>
                <ul className="mt-3 space-y-2">
                  {ISSUES[active.issue].exercises.map((id) => (
                    <li key={id}>
                      <button
                        onClick={() => play(id)}
                        className="w-full card card-link px-3.5 py-3 flex items-center gap-3 text-left"
                      >
                        <span className="w-8 h-8 rounded-full bg-stone-900 text-white flex items-center justify-center shrink-0">
                          <i className="fas fa-play text-[10px] ml-0.5" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-medium">{EXERCISES[id].name}</span>
                          <span className="block text-xs text-stone-500 tnum">{EXERCISES[id].reps}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
