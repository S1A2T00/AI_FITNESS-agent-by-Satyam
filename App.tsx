
import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Link } from 'react-router-dom';
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
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 fade-up">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight">Medications</h1>
          <p className="text-stone-500 mt-1">Medicines identified from your prescriptions and packaging.</p>
        </div>
        <Link to="/analyze" className="btn btn-secondary self-start"><i className="fas fa-plus text-xs" /> Add from photo</Link>
      </header>

      {medications.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 fade-up">
          {medications.map((med) => (
            <article key={med.id} className="card card-link p-5 flex flex-col">
              <span className="w-9 h-9 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                <i className="fas fa-capsules text-[13px]" />
              </span>
              <h2 className="font-semibold mt-4 line-clamp-1" title={med.summary}>{med.summary.split('.')[0]}</h2>
              <p className="text-sm text-stone-500 mt-1.5 line-clamp-3">{med.summary}</p>
              <p className="text-xs text-stone-400 mt-auto pt-4">Added {new Date(med.timestamp).toLocaleDateString()}</p>
            </article>
          ))}
        </div>
      ) : (
        <div className="card px-6 py-16 text-center fade-up">
          <span className="inline-flex w-10 h-10 rounded-full bg-amber-50 text-amber-700 items-center justify-center">
            <i className="fas fa-prescription text-sm" />
          </span>
          <h2 className="font-semibold mt-4">No medications yet</h2>
          <p className="text-sm text-stone-500 mt-1 max-w-sm mx-auto">Photograph a prescription or medicine box and the AI will explain what it is and how to take it.</p>
          <Link to="/analyze" className="btn btn-primary mt-6">Add from photo</Link>
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
        <p className="mb-6 rounded-xl bg-red-50 text-red-700 ring-1 ring-red-600/15 p-4 text-sm">
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
