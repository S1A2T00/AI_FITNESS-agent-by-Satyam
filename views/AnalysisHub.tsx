
import React, { useState, useRef } from 'react';
import { performAnalysis } from '../services/geminiService';
import { AnalysisType, AnalysisResult } from '../types';
import { MEDICAL_DISCLAIMER } from '../constants';
import { TiltCard } from '../components/Three3D';

interface AnalysisHubProps {
  onAnalysisComplete: (result: AnalysisResult) => void;
}

export const AnalysisHub: React.FC<AnalysisHubProps> = ({ onAnalysisComplete }) => {
  const [activeType, setActiveType] = useState<AnalysisType>('BODY_POSE');
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

  const TYPES: { id: AnalysisType; title: string; desc: string; icon: string; tone: string; ring: string }[] = [
    { id: 'BODY_POSE', title: 'Physique & posture', desc: 'Front + side photos', icon: 'fa-person', tone: 'text-coral', ring: 'border-coral/50 bg-coral/[0.07] shadow-[0_0_30px_-10px_#FF5C7A]' },
    { id: 'MEDICAL_REPORT', title: 'Lab & medical reports', desc: 'Blood work, panels, records', icon: 'fa-flask-vial', tone: 'text-vital', ring: 'border-vital/50 bg-vital/[0.07] shadow-[0_0_30px_-10px_#4FF0B4]' },
    { id: 'MEDICINE', title: 'Meds & prescriptions', desc: 'Pill packs, Rx slips', icon: 'fa-capsules', tone: 'text-amberx', ring: 'border-amberx/50 bg-amberx/[0.07] shadow-[0_0_30px_-10px_#FFB547]' },
  ];

  const UploadSlot: React.FC<{
    label: string; hint: string; icon: string; image: string | null;
    inputRef: React.RefObject<HTMLInputElement | null>; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; tall?: boolean;
  }> = ({ label, hint, icon, image, inputRef, onChange, tall }) => (
    <div className="space-y-2">
      <p className="eyebrow">{label}</p>
      <TiltCard max={5} className="rounded-2xl">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={`relative w-full ${tall ? 'aspect-[3/4]' : 'min-h-[260px]'} rounded-2xl border border-dashed overflow-hidden flex items-center justify-center transition-colors ${
            image ? 'border-vital/60' : 'border-mist-700/60 hover:border-vital/50 bg-ink-950/40'
          } ${isAnalyzing && image ? 'scanline' : ''}`}
        >
          <input type="file" ref={inputRef} className="hidden" onChange={onChange} accept="image/jpeg,image/png,image/webp" />
          {image ? (
            <img src={image} className={`${tall ? 'w-full h-full object-cover' : 'max-h-72 rounded-xl'}`} alt={label} />
          ) : (
            <div className="text-center p-6">
              <div className="w-14 h-14 rounded-2xl bg-ink-800 border border-white/[0.06] flex items-center justify-center mx-auto text-mist-300">
                <i className={`fas ${icon} text-xl`} />
              </div>
              <p className="text-sm font-medium mt-4">{hint}</p>
              <p className="font-mono text-[10px] text-mist-500 mt-1">JPG · PNG · WEBP</p>
            </div>
          )}
          {image && !isAnalyzing && (
            <span className="absolute top-3 right-3 font-mono text-[10px] px-2 py-1 rounded-md bg-ink-950/80 text-vital border border-vital/30">READY</span>
          )}
        </button>
      </TiltCard>
    </div>
  );

  return (
    <div className="space-y-8">
      <header className="rise">
        <p className="eyebrow">Analyzer</p>
        <h1 className="font-display text-4xl md:text-5xl font-extrabold mt-2">Health intelligence<span className="text-vital">.</span></h1>
        <p className="text-mist-500 mt-2">Choose what to analyze, upload a clear photo, and let the AI read it.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-3 rise rise-1">
          {TYPES.map((t, i) => {
            const active = activeType === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => resetPreviews(t.id)}
                aria-pressed={active}
                className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center gap-4 ${
                  active ? t.ring : 'border-white/[0.07] bg-ink-900/60 hover:border-white/[0.15]'
                }`}
              >
                <span className="font-mono text-[10px] text-mist-700 w-5">0{i + 1}</span>
                <span className={`w-11 h-11 rounded-xl flex items-center justify-center bg-ink-800 border border-white/[0.06] ${active ? t.tone : 'text-mist-500'}`}>
                  <i className={`fas ${t.icon} text-lg`} />
                </span>
                <span>
                  <span className="block font-semibold">{t.title}</span>
                  <span className="block text-xs text-mist-500 mt-0.5">{t.desc}</span>
                </span>
              </button>
            );
          })}
          <div className="panel p-4 text-xs text-mist-500 leading-relaxed">
            <i className="fas fa-shield-halved text-vital mr-2" />
            Images are sent to the AI for this analysis only and are not stored.
          </div>
        </div>

        <div className="lg:col-span-8 space-y-6 rise rise-2">
          {!result && (
            <div className="panel p-6 md:p-8">
              {activeType === 'BODY_POSE' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
                  <UploadSlot label="01 · Front view" hint="Upload front view" icon="fa-user" image={previews.front} inputRef={frontInputRef} onChange={handleFileChange('front')} tall />
                  <UploadSlot label="02 · Side view" hint="Upload side view" icon="fa-person-walking" image={previews.side} inputRef={sideInputRef} onChange={handleFileChange('side')} tall />
                </div>
              ) : (
                <div className="mb-8">
                  <UploadSlot
                    label={activeType === 'MEDICAL_REPORT' ? 'Report image' : 'Prescription / medicine image'}
                    hint={`Upload ${activeType === 'MEDICAL_REPORT' ? 'report' : 'prescription'}`}
                    icon="fa-file-arrow-up"
                    image={previews.main}
                    inputRef={fileInputRef}
                    onChange={handleFileChange('main')}
                  />
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center gap-4 justify-between">
                <p className="font-mono text-[11px] text-mist-500">
                  {isAnalyzing ? 'SCANNING · this can take ~20s' : isReadyToAnalyze() ? 'ALL INPUTS READY' : activeType === 'BODY_POSE' ? 'NEED FRONT + SIDE VIEW' : 'NEED ONE CLEAR IMAGE'}
                </p>
                <button onClick={runAnalysis} disabled={isAnalyzing || !isReadyToAnalyze()} className="btn-vital w-full sm:w-auto !px-8">
                  {isAnalyzing ? <i className="fas fa-circle-notch fa-spin" /> : <i className="fas fa-wand-magic-sparkles" />}
                  {isAnalyzing ? 'Analyzing…' : 'Run analysis'}
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-coral/30 bg-coral/10 text-coral p-4 flex items-center gap-3 text-sm">
              <i className="fas fa-circle-xmark" />{error}
            </div>
          )}

          {result && (
            <div className="panel overflow-hidden rise">
              <div className="px-6 py-4 border-b border-white/[0.06] flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[10px] px-2 py-1 rounded-md bg-vital/10 text-vital border border-vital/30">INTELLIGENCE REPORT</span>
                  <span className="font-mono text-[10px] text-mist-500">{new Date(result.timestamp).toLocaleString()}</span>
                </div>
                <button onClick={() => setResult(null)} aria-label="Close report" className="text-mist-500 hover:text-mist-100"><i className="fas fa-xmark text-lg" /></button>
              </div>

              <div className="p-6 md:p-8 space-y-8">
                <div>
                  <p className="eyebrow mb-2">Summary</p>
                  <p className="text-mist-100 leading-relaxed text-[15px]">{result.summary}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {result.metrics.map((m, idx) => (
                    <TiltCard key={idx} max={6} className="rounded-2xl border border-white/[0.07] bg-ink-950/50 p-4">
                      <div className="flex items-center justify-between">
                        <p className="eyebrow truncate">{m.label}</p>
                        <span className={`dot dot-${m.status}`} />
                      </div>
                      <p className="font-display text-2xl font-bold mt-3">{m.value}</p>
                      <p className={`font-mono text-[10px] uppercase mt-1 ${
                        m.status === 'normal' ? 'text-vital' : m.status === 'warning' ? 'text-amberx' : m.status === 'critical' ? 'text-coral' : 'text-mist-500'
                      }`}>{m.status}</p>
                      {m.description && <p className="text-xs text-mist-500 mt-3 leading-relaxed">{m.description}</p>}
                    </TiltCard>
                  ))}
                </div>

                <div>
                  <p className="eyebrow mb-3">Recommendations</p>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {result.recommendations.map((rec, idx) => (
                      <li key={idx} className="flex items-start gap-3 p-4 rounded-2xl bg-plasma/[0.06] border border-plasma/20 text-sm text-mist-100">
                        <span className="font-mono text-[10px] text-plasma-300 mt-0.5">{String(idx + 1).padStart(2, '0')}</span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-2xl p-4 flex gap-3 items-start border border-amberx/25 bg-amberx/[0.07]">
                  <i className="fas fa-triangle-exclamation text-amberx mt-0.5" />
                  <p className="text-xs text-amberx/90 leading-relaxed">{MEDICAL_DISCLAIMER}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
