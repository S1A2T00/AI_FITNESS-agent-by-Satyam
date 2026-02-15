
import React, { useState, useRef } from 'react';
import { performAnalysis } from '../services/geminiService';
import { AnalysisType, AnalysisResult } from '../types';
import { MEDICAL_DISCLAIMER } from '../constants';

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
      let imagesToAnalyze: string[] = [];
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

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h1 className="text-3xl font-extrabold text-slate-900">Health Intelligence Analyzer</h1>
        <p className="text-slate-500 mt-1">Select an analysis type and upload relevant media.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Selection Sidebar */}
        <div className="lg:col-span-4 space-y-4">
          <div 
            onClick={() => resetPreviews('BODY_POSE')}
            className={`p-5 rounded-2xl border transition-all cursor-pointer flex items-center gap-4 ${activeType === 'BODY_POSE' ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-slate-200 bg-white'}`}
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${activeType === 'BODY_POSE' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
              <i className="fas fa-person-running text-xl"></i>
            </div>
            <div>
              <p className="font-bold text-slate-900">Physique & Posture</p>
              <p className="text-xs text-slate-500">Front & Side view analysis.</p>
            </div>
          </div>

          <div 
            onClick={() => resetPreviews('MEDICAL_REPORT')}
            className={`p-5 rounded-2xl border transition-all cursor-pointer flex items-center gap-4 ${activeType === 'MEDICAL_REPORT' ? 'border-emerald-500 bg-emerald-50 shadow-sm' : 'border-slate-200 bg-white'}`}
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${activeType === 'MEDICAL_REPORT' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
              <i className="fas fa-file-medical text-xl"></i>
            </div>
            <div>
              <p className="font-bold text-slate-900">Lab & Medical Reports</p>
              <p className="text-xs text-slate-500">Analyze blood work & records.</p>
            </div>
          </div>

          <div 
            onClick={() => resetPreviews('MEDICINE')}
            className={`p-5 rounded-2xl border transition-all cursor-pointer flex items-center gap-4 ${activeType === 'MEDICINE' ? 'border-amber-500 bg-amber-50 shadow-sm' : 'border-slate-200 bg-white'}`}
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${activeType === 'MEDICINE' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
              <i className="fas fa-prescription text-xl"></i>
            </div>
            <div>
              <p className="font-bold text-slate-900">Meds & Prescription</p>
              <p className="text-xs text-slate-500">Explain medication & usage.</p>
            </div>
          </div>
        </div>

        {/* Upload & Result Area */}
        <div className="lg:col-span-8 space-y-6">
          {!result && (
            <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                <i className={`fas ${activeType === 'BODY_POSE' ? 'fa-camera' : 'fa-upload'} text-blue-500`}></i>
                {activeType === 'BODY_POSE' ? 'Posture Capture' : 'Document Upload'}
              </h3>

              {activeType === 'BODY_POSE' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  {/* Front View */}
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-slate-600">1. Front View</p>
                    <div 
                      onClick={() => frontInputRef.current?.click()}
                      className={`relative aspect-[3/4] rounded-2xl border-2 border-dashed flex items-center justify-center cursor-pointer transition-all overflow-hidden ${previews.front ? 'border-blue-500' : 'border-slate-200 hover:border-blue-300'}`}
                    >
                      <input type="file" ref={frontInputRef} className="hidden" onChange={handleFileChange('front')} accept="image/*" />
                      {previews.front ? (
                        <img src={previews.front} className="w-full h-full object-cover" alt="Front view" />
                      ) : (
                        <div className="text-center p-4">
                          <i className="fas fa-user text-3xl text-slate-300 mb-2"></i>
                          <p className="text-xs text-slate-400 font-medium">Click to upload front view</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Side View */}
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-slate-600">2. Side View</p>
                    <div 
                      onClick={() => sideInputRef.current?.click()}
                      className={`relative aspect-[3/4] rounded-2xl border-2 border-dashed flex items-center justify-center cursor-pointer transition-all overflow-hidden ${previews.side ? 'border-blue-500' : 'border-slate-200 hover:border-blue-300'}`}
                    >
                      <input type="file" ref={sideInputRef} className="hidden" onChange={handleFileChange('side')} accept="image/*" />
                      {previews.side ? (
                        <img src={previews.side} className="w-full h-full object-cover" alt="Side view" />
                      ) : (
                        <div className="text-center p-4">
                          <i className="fas fa-user-tag text-3xl text-slate-300 mb-2"></i>
                          <p className="text-xs text-slate-400 font-medium">Click to upload side view</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={`bg-slate-50 border-2 border-dashed rounded-3xl p-12 text-center cursor-pointer transition-all mb-8 ${previews.main ? 'border-blue-500' : 'border-slate-200 hover:border-blue-300'}`}
                >
                  <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange('main')} accept="image/*" />
                  {previews.main ? (
                    <img src={previews.main} className="mx-auto max-h-64 rounded-xl shadow-md border border-slate-100" alt="Main preview" />
                  ) : (
                    <div className="space-y-4">
                      <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm text-slate-400">
                        <i className="fas fa-file-arrow-up text-2xl"></i>
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800">Upload {activeType === 'MEDICAL_REPORT' ? 'Report' : 'Prescription'}</h4>
                        <p className="text-slate-500 text-xs mt-1">Tap to select a clear image from your gallery.</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-col items-center">
                <button 
                  onClick={runAnalysis}
                  disabled={isAnalyzing || !isReadyToAnalyze()}
                  className="w-full sm:w-auto px-12 py-3.5 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg shadow-blue-200"
                >
                  {isAnalyzing ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-wand-magic-sparkles"></i>}
                  {isAnalyzing ? 'Processing...' : 'Run Intelligence Analysis'}
                </button>
                {!isReadyToAnalyze() && (
                  <p className="text-[10px] text-slate-400 mt-3 italic">
                    {activeType === 'BODY_POSE' ? 'Both front and side views are required for accurate analysis.' : 'Please upload a clear image to continue.'}
                  </p>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="bg-rose-50 border border-rose-100 text-rose-700 p-4 rounded-xl flex items-center gap-3">
              <i className="fas fa-circle-xmark"></i>
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {result && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden animate-in slide-in-from-top-4 duration-500">
              <div className="p-6 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-tighter">INTELLIGENCE REPORT</span>
                  <p className="text-slate-400 text-[10px] font-medium">{new Date(result.timestamp).toLocaleString()}</p>
                </div>
                <button onClick={() => setResult(null)} className="text-slate-400 hover:text-slate-600"><i className="fas fa-xmark text-xl"></i></button>
              </div>

              <div className="p-6 md:p-8 space-y-8">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 mb-2">Analysis Summary</h2>
                  <p className="text-slate-600 leading-relaxed text-sm md:text-base">{result.summary}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {result.metrics.map((m, idx) => (
                    <div key={idx} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50">
                      <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">{m.label}</p>
                      <p className="text-xl font-bold text-slate-800 mt-1">{m.value}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${
                          m.status === 'normal' ? 'bg-emerald-500' : 
                          m.status === 'warning' ? 'bg-amber-500' : 
                          m.status === 'critical' ? 'bg-rose-500' : 'bg-slate-400'
                        }`}></span>
                        <span className="text-[10px] font-bold uppercase text-slate-500">{m.status}</span>
                      </div>
                      {m.description && <p className="text-[10px] text-slate-400 mt-2 italic">"{m.description}"</p>}
                    </div>
                  ))}
                </div>

                <div>
                  <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <i className="fas fa-lightbulb text-amber-500"></i>
                    AI Recommendations
                  </h2>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {result.recommendations.map((rec, idx) => (
                      <li key={idx} className="flex items-start gap-3 p-4 bg-blue-50/30 rounded-2xl text-slate-700 text-sm border border-blue-50">
                        <i className="fas fa-circle-check text-blue-500 mt-0.5"></i>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-6 border-t border-slate-100">
                  <div className="bg-amber-50 rounded-2xl p-4 flex gap-4 items-start border border-amber-100">
                    <i className="fas fa-triangle-exclamation text-amber-600 mt-1"></i>
                    <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
                      {MEDICAL_DISCLAIMER}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
