
import React from 'react';
import { Link } from 'react-router-dom';
import { AnalysisResult } from '../types';

const StatCard: React.FC<{ label: string; value: string; icon: string; color: string }> = ({ label, value, icon, color }) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
    <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center mb-4`}>
      <i className={`fas ${icon} text-white text-xl`}></i>
    </div>
    <p className="text-slate-500 text-sm font-medium">{label}</p>
    <h3 className="text-2xl font-bold mt-1">{value}</h3>
  </div>
);

export const Dashboard: React.FC<{ history: AnalysisResult[] }> = ({ history }) => {
  const hasData = history.length > 0;
  const latestAnalysis = history[0];
  const medicineCount = history.filter(h => h.type === 'MEDICINE').length;
  
  // Dynamic Score Calculation (simple demo logic)
  const healthScore = hasData ? 70 + (history.length * 2) : 0;
  const clampedScore = Math.min(healthScore, 98);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">Your Health Dashboard</h1>
          <p className="text-slate-500 mt-1">
            {hasData ? "Welcome back! Here's your latest update." : "Welcome! Start your journey by analyzing your first report or photo."}
          </p>
        </div>
        <div className="flex gap-3">
          <Link to="/analyze" className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold transition-colors flex items-center gap-2">
            <i className="fas fa-plus"></i>
            New Analysis
          </Link>
        </div>
      </header>

      {/* Hero Score Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-gradient-to-br from-blue-600 to-blue-800 rounded-3xl p-8 text-white relative overflow-hidden">
          <div className="relative z-10 flex flex-col h-full">
            <div className="flex justify-between items-start">
              <div>
                <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Vitalis Health Score</span>
                <h2 className="text-5xl font-black mt-4">
                  {hasData ? clampedScore : '--'}<span className="text-2xl font-medium text-blue-200">/100</span>
                </h2>
                <p className="text-blue-100 mt-2 max-w-sm">
                  {hasData 
                    ? `Based on ${history.length} analysis ${history.length === 1 ? 'record' : 'records'}. Your score improves as you provide more data.` 
                    : "Upload your first health report to calculate your baseline health score."}
                </p>
              </div>
              <div className="hidden sm:block">
                <i className="fas fa-heart-pulse text-8xl text-white/10"></i>
              </div>
            </div>
            {hasData && (
              <div className="mt-8 pt-6 border-t border-white/10 flex flex-wrap gap-6">
                <div className="flex items-center gap-2">
                  <i className="fas fa-calendar"></i>
                  <span>Last Update: {latestAnalysis.timestamp.toLocaleDateString()}</span>
                </div>
              </div>
            )}
          </div>
          <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <i className="fas fa-bullseye text-blue-500"></i>
            Progress Tracker
          </h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Data Completeness</span>
                <span className="font-bold">{Math.min(history.length * 20, 100)}%</span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full transition-all duration-1000" style={{ width: `${Math.min(history.length * 20, 100)}%` }}></div>
              </div>
            </div>
            <p className="text-xs text-slate-400 italic">
              {history.length < 5 ? `Analyze ${5 - history.length} more items for a full profile.` : "Your health profile is now highly detailed."}
            </p>
          </div>
          <Link to="/analyze" className="mt-6 w-full py-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-600 font-semibold transition-colors text-sm text-center">
            Log New Data
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <StatCard label="Analyses" value={history.length.toString()} icon="fa-magnifying-glass" color="bg-blue-500" />
        <StatCard label="Meds Tracked" value={medicineCount.toString()} icon="fa-pills" color="bg-indigo-500" />
        <StatCard label="Reports" value={history.filter(h => h.type === 'MEDICAL_REPORT').length.toString()} icon="fa-file-medical" color="bg-emerald-500" />
        <StatCard label="Body Scans" value={history.filter(h => h.type === 'BODY_POSE').length.toString()} icon="fa-person" color="bg-rose-500" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-slate-800">Latest Insights</h3>
            {hasData && <Link to="/history" className="text-blue-600 font-medium text-sm">See all</Link>}
          </div>
          <div className="space-y-4">
            {hasData ? (
              history.slice(0, 3).map((item) => (
                <div key={item.id} className="flex gap-4 p-4 bg-white rounded-2xl border border-slate-100 items-start">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    item.type === 'BODY_POSE' ? 'bg-rose-50 text-rose-600' :
                    item.type === 'MEDICAL_REPORT' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                  }`}>
                    <i className={`fas ${
                      item.type === 'BODY_POSE' ? 'fa-person' :
                      item.type === 'MEDICAL_REPORT' ? 'fa-file-medical' : 'fa-pills'
                    }`}></i>
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-sm">{item.type.replace('_', ' ')} Analysis</p>
                    <p className="text-slate-500 text-xs mt-1 line-clamp-2">{item.summary}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-8 text-center">
                <p className="text-slate-400 text-sm">Your insights will appear here once you run your first analysis.</p>
              </div>
            )}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-slate-800">Your Health Log</h3>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            {hasData ? (
              history.slice(0, 4).map((item, idx) => (
                <div key={item.id} className={`p-4 flex items-center justify-between ${idx !== history.slice(0, 4).length - 1 ? 'border-b border-slate-50' : ''}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <div>
                      <p className="font-bold text-sm">{item.type.replace('_', ' ')} Capture</p>
                      <p className="text-[10px] text-slate-500">{item.timestamp.toLocaleString()}</p>
                    </div>
                  </div>
                  <i className="fas fa-chevron-right text-slate-300 text-xs"></i>
                </div>
              ))
            ) : (
              <div className="p-8 text-center">
                <p className="text-slate-400 text-sm">Start building your health history today.</p>
                <Link to="/analyze" className="text-blue-600 text-xs font-bold mt-2 inline-block">GO TO ANALYSIS</Link>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
