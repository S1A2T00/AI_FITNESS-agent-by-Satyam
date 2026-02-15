
import React from 'react';
import { AnalysisResult } from '../types';

interface HealthHistoryProps {
  history: AnalysisResult[];
  onDelete: (id: string) => void;
}

export const HealthHistory: React.FC<HealthHistoryProps> = ({ history, onDelete }) => {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h1 className="text-3xl font-extrabold text-slate-900">Health History</h1>
        <p className="text-slate-500 mt-1">A comprehensive timeline of your AI health analyses.</p>
      </header>

      {history.length > 0 ? (
        <div className="space-y-4">
          {history.map((item) => (
            <div key={item.id} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                    item.type === 'BODY_POSE' ? 'bg-rose-50 text-rose-600' :
                    item.type === 'MEDICAL_REPORT' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                  }`}>
                    <i className={`fas ${
                      item.type === 'BODY_POSE' ? 'fa-person' :
                      item.type === 'MEDICAL_REPORT' ? 'fa-file-medical' : 'fa-pills'
                    } text-2xl`}></i>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900">{item.type.replace('_', ' ')} Analysis</h3>
                      <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                        {new Date(item.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mt-1 line-clamp-2 max-w-2xl">{item.summary}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 ml-auto md:ml-0">
                  <button className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-sm font-semibold transition-colors">
                    View Full Details
                  </button>
                  <button 
                    onClick={() => onDelete(item.id)}
                    className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                    title="Delete record"
                  >
                    <i className="fas fa-trash-can"></i>
                  </button>
                </div>
              </div>
              
              {/* Analysis Indicators */}
              <div className="mt-4 flex flex-wrap gap-2">
                {item.metrics.slice(0, 3).map((m, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 rounded-lg border border-slate-100">
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      m.status === 'normal' ? 'bg-emerald-500' : 
                      m.status === 'warning' ? 'bg-amber-500' : 'bg-rose-500'
                    }`}></span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase">{m.label}: {m.value}</span>
                  </div>
                ))}
                {item.metrics.length > 3 && (
                  <span className="text-[10px] font-bold text-slate-400 py-1">+{item.metrics.length - 3} more</span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-20 text-center">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-200 mb-6">
            <i className="fas fa-history text-4xl"></i>
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Your timeline is empty</h2>
          <p className="text-slate-500 mt-2 max-w-sm mx-auto">
            Once you start analyzing reports, posture, or medications, they will appear here in a beautiful chronological timeline.
          </p>
          <div className="mt-8">
            <a href="#/analyze" className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100">
              <i className="fas fa-plus"></i>
              Start First Analysis
            </a>
          </div>
        </div>
      )}
    </div>
  );
};
