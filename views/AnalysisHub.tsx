
import React, { useState, useRef } from 'react';
import { performAnalysis } from '../services/geminiService';
import { AnalysisType, AnalysisResult } from '../types';
import { MEDICAL_DISCLAIMER } from '../constants';
import { statusLabel } from './Dashboard';

interface AnalysisHubProps {
  onAnalysisComplete: (result: AnalysisResult) => void;
}

const UploadSlot: React.FC<{
  label: string;
  hint: string;
  image: string | null;
  scanning: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  tall?: boolean;
}> = ({ label, hint, image, scanning, inputRef, onChange, tall }) => (
  <div>
    <p className="text-sm font-medium text-stone-700 mb-2">{label}</p>
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      className={`relative w-full ${tall ? 'aspect-[3/4]' : 'min-h-[240px]'} rounded-xl overflow-hidden flex items-center justify-center transition-colors ${
        image ? 'border border-line bg-stone-50' : 'border border-dashed border-stone-300 hover:border-stone-400 hover:bg-stone-50'
      } ${scanning ? 'scanning' : ''}`}
    >
      <input type="file" ref={inputRef} className="hidden" onChange={onChange} accept="image/jpeg,image/png,image/webp" />
      {image ? (
        <>
          <img src={image} className={tall ? 'w-full h-full object-cover' : 'max-h-64 rounded-lg'} alt={label} />
          {!scanning && <span className="absolute top-2.5 right-2.5 btn btn-secondary !h-7 !px-2.5 text-xs">Replace</span>}
        </>
      ) : (
        <span className="text-center px-6">
          <span className="inline-flex w-10 h-10 rounded-full bg-stone-100 text-stone-500 items-center justify-center">
            <i className="fas fa-arrow-up-from-bracket text-sm" />
          </span>
          <span className="block text-sm font-medium mt-3">{hint}</span>
          <span className="block text-xs text-stone-400 mt-1">JPG, PNG or WEBP</span>
        </span>
      )}
    </button>
  </div>
);

export const AnalysisHub: React.FC<AnalysisHubProps> = ({ onAnalysisComplete }) => {
  const [activeType, setActiveType] = useState<AnalysisType>('MEDICAL_REPORT');
  const [previews, setPreviews] = useState<{ [key: string]: string | null }>({
    main: null,
    front: null,
    side: null
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const frontInputRef = useRef<HTMLInputElement>(null);
  const sideInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (slot: 'main' | 'front' | 'side') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviews(prev => ({ ...prev, [slot]: reader.result as string }));
      };
      reader.readAsDataURL(selected);
      setResult(null);
    }
  };

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    setError(null);
    try {
      const imagesToAnalyze: string[] = [];
      if (activeType === 'BODY_POSE') {
        if (previews.front) imagesToAnalyze.push(previews.front);
        if (previews.side) imagesToAnalyze.push(previews.side);
      } else {
        if (previews.main) imagesToAnalyze.push(previews.main);
      }

      if (imagesToAnalyze.length === 0) {
        setError("Please upload the required images first.");
        setIsAnalyzing(false);
        return;
      }

      const promptAddon = activeType === 'BODY_POSE' 
        ? "Please analyze both the front and side views for posture, symmetry, and muscle development."
        : "";

      const data = await performAnalysis(activeType, imagesToAnalyze, promptAddon);
      setResult(data);
      onAnalysisComplete(data);
    } catch (err) {
      setError("Failed to analyze. Please ensure your API key is correct and the images are clear.");
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetPreviews = (type: AnalysisType) => {
    setActiveType(type);
    setResult(null);
    setPreviews({ main: null, front: null, side: null });
  };

  const isReadyToAnalyze = () => {
    if (activeType === 'BODY_POSE') return previews.front && previews.side;
    return previews.main;
  };

  const TYPES: { id: AnalysisType; title: string; desc: string; icon: string }[] = [
    { id: 'MEDICAL_REPORT', title: 'Lab report', desc: 'Blood work, panels and medical records', icon: 'fa-flask-vial' },
    { id: 'BODY_POSE', title: 'Posture', desc: 'Front and side photos of your stance', icon: 'fa-person' },
    { id: 'MEDICINE', title: 'Medication', desc: 'Prescriptions and medicine packaging', icon: 'fa-capsules' },
  ];
  const current = TYPES.find((t) => t.id === activeType)!;

  return (
    <div className="space-y-6">
      <header className="fade-up">
        <h1 className="text-[28px] font-semibold tracking-tight">New analysis</h1>
        <p className="text-stone-500 mt-1">Upload a clear photo and the AI explains what it finds in plain language.</p>
      </header>

      {/* Type selector */}
      <div role="tablist" className="inline-flex p-1 rounded-xl bg-stone-100 fade-up">
        {TYPES.map((t) => {
          const active = activeType === t.id;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={active}
              onClick={() => resetPreviews(t.id)}
              className={`h-9 px-3 sm:px-4 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${
                active ? 'bg-white text-stone-900 shadow-card' : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              <i className={`fas ${t.icon} text-xs`} />{t.title}
            </button>
          );
        })}
      </div>

      {!result && (
        <section className="card p-5 sm:p-6 fade-up">
          <p className="text-sm text-stone-500 mb-5">{current.desc}</p>
          {activeType === 'BODY_POSE' ? (
            <div className="grid grid-cols-2 gap-4">
              <UploadSlot label="Front view" hint="Upload front photo" image={previews.front} scanning={isAnalyzing} inputRef={frontInputRef} onChange={handleFileChange('front')} tall />
              <UploadSlot label="Side view" hint="Upload side photo" image={previews.side} scanning={isAnalyzing} inputRef={sideInputRef} onChange={handleFileChange('side')} tall />
            </div>
          ) : (
            <UploadSlot
              label={activeType === 'MEDICAL_REPORT' ? 'Report' : 'Prescription or packaging'}
              hint={`Upload ${activeType === 'MEDICAL_REPORT' ? 'a report' : 'a prescription'}`}
              image={previews.main}
              scanning={isAnalyzing}
              inputRef={fileInputRef}
              onChange={handleFileChange('main')}
            />
          )}

          <div className="mt-6 pt-5 border-t border-line flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs text-stone-500 flex items-center gap-2">
              <i className="fas fa-lock text-[10px]" /> Photos are used for this analysis only and aren't stored.
            </p>
            <button onClick={runAnalysis} disabled={isAnalyzing || !isReadyToAnalyze()} className="btn btn-primary">
              {isAnalyzing ? <><i className="fas fa-circle-notch fa-spin text-xs" /> Analyzing…</> : 'Analyze'}
            </button>
          </div>
        </section>
      )}

      {error && (
        <div className="rounded-xl bg-red-50 text-red-700 ring-1 ring-red-600/15 p-4 text-sm flex items-center gap-3">
          <i className="fas fa-circle-exclamation" />{error}
        </div>
      )}

      {result && (
        <article className="card fade-up">
          <div className="flex items-center justify-between px-6 h-14 border-b border-line">
            <div className="flex items-center gap-3">
              <h2 className="font-semibold">Results</h2>
              <span className="text-xs text-stone-400">{new Date(result.timestamp).toLocaleString()}</span>
            </div>
            <button onClick={() => setResult(null)} className="btn btn-secondary !h-8 text-xs">New analysis</button>
          </div>

          <div className="p-6 space-y-8">
            <p className="text-[15px] leading-relaxed text-stone-700 max-w-3xl">{result.summary}</p>

            <div>
              <h3 className="text-sm font-medium text-stone-500 mb-3">Measurements</h3>
              <div className="rounded-xl border border-line divide-y divide-line">
                {result.metrics.map((m, idx) => (
                  <div key={idx} className="px-4 py-3 grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_10rem_7rem] items-center gap-x-4 gap-y-1">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{m.label}</p>
                      {m.description && <p className="text-xs text-stone-500 mt-0.5">{m.description}</p>}
                    </div>
                    <p className="text-sm tnum sm:text-right font-medium">{m.value}</p>
                    <span className={`pill pill-${m.status} justify-self-start sm:justify-self-end col-span-2 sm:col-span-1`}>
                      <span className="dot" />{statusLabel[m.status] ?? m.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-stone-500 mb-3">Recommendations</h3>
              <ol className="space-y-2.5">
                {result.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex gap-3 text-sm text-stone-700">
                    <span className="w-5 h-5 rounded-full bg-stone-100 text-stone-600 text-xs flex items-center justify-center shrink-0 tnum">{idx + 1}</span>
                    {rec}
                  </li>
                ))}
              </ol>
            </div>

            <p className="text-xs text-stone-500 leading-relaxed border-t border-line pt-5">
              <i className="fas fa-circle-info mr-1.5" />{MEDICAL_DISCLAIMER}
            </p>
          </div>
        </article>
      )}
    </div>
  );
};
