
import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './views/Dashboard';
import { AnalysisHub } from './views/AnalysisHub';
import { AICoach } from './views/AICoach';
import { HealthHistory } from './views/HealthHistory';
import { AnalysisResult } from './types';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './views/Login';
import { AdminPanel } from './views/AdminPanel';
import { fetchHistory, deleteHistoryItem } from './services/geminiService';

const MedicineView: React.FC<{ history: AnalysisResult[] }> = ({ history }) => {
  const medications = history.filter(h => h.type === 'MEDICINE');

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-extrabold text-slate-900">Medications & Rx</h1>
        <p className="text-slate-500 mt-1">Manage your prescriptions and learn about your medicine.</p>
      </header>
      
      <div className="bg-amber-50 border border-amber-100 p-6 rounded-3xl flex items-start gap-4">
        <i className="fas fa-circle-info text-amber-600 text-xl mt-1"></i>
        <div>
          <h4 className="font-bold text-amber-900">Health Pro-Tip</h4>
          <p className="text-amber-800 text-sm mt-1">You can use the "Health Analysis" tool to upload a photo of your prescription. The AI will parse it and add the meds here automatically.</p>
        </div>
      </div>

      {medications.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {medications.map((med) => (
            <div key={med.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center">
                  <i className="fas fa-pills text-xl"></i>
                </div>
                <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-1 rounded uppercase">Analyzed</span>
              </div>
              <h3 className="font-bold text-lg truncate" title={med.summary}>{med.summary.split('.')[0]}</h3>
              <p className="text-sm text-slate-500 mt-1 line-clamp-2">{med.summary}</p>
              <div className="mt-6 pt-6 border-t border-slate-50 flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-400">Captured {new Date(med.timestamp).toLocaleDateString()}</span>
                <button className="text-blue-600 hover:underline">View Details</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300 mb-4">
            <i className="fas fa-prescription text-2xl"></i>
          </div>
          <p className="text-slate-500">No medications identified yet. Start by uploading a prescription or medicine photo.</p>
        </div>
      )}
    </div>
  );
};

const AuthenticatedApp: React.FC = () => {
  const { user } = useAuth();
  const uid = user!.uid;
  const [analysisHistory, setAnalysisHistory] = useState<AnalysisResult[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  // History is stored in PostgreSQL per user, so it follows the account
  // across devices.
  useEffect(() => {
    let cancelled = false;
    setLoadError(null);
    fetchHistory()
      .then((items) => { if (!cancelled) setAnalysisHistory(items); })
      .catch((e: Error) => { if (!cancelled) setLoadError(e.message); });
    return () => { cancelled = true; };
  }, [uid]);

  // The server already saved it; just show it.
  const addAnalysis = (result: AnalysisResult) =>
    setAnalysisHistory((prev) => [result, ...prev]);

  const deleteAnalysis = async (id: string) => {
    const previous = analysisHistory;
    setAnalysisHistory(previous.filter(item => item.id !== id));
    try {
      await deleteHistoryItem(id);
    } catch (e) {
      setAnalysisHistory(previous);
      alert((e as Error).message);
    }
  };

  return (
    <Layout>
      {loadError && (
        <p className="mb-6 bg-red-50 border border-red-100 text-red-700 rounded-2xl p-4 text-sm">
          Could not load your health history: {loadError}
        </p>
      )}
      <Routes>
        <Route path="/" element={<Dashboard history={analysisHistory} />} />
        <Route path="/analyze" element={<AnalysisHub onAnalysisComplete={addAnalysis} />} />
        <Route path="/medicine" element={<MedicineView history={analysisHistory} />} />
        <Route path="/coach" element={<AICoach history={analysisHistory} />} />
        <Route path="/history" element={<HealthHistory history={analysisHistory} onDelete={deleteAnalysis} />} />
        <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminPanel /></ProtectedRoute>} />
      </Routes>
    </Layout>
  );
};

const App: React.FC = () => (
  <AuthProvider>
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/*" element={<ProtectedRoute><AuthenticatedApp /></ProtectedRoute>} />
      </Routes>
    </Router>
  </AuthProvider>
);

export default App;
