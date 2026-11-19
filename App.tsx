
import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { TiltCard } from './components/Three3D';
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
    <div className="space-y-8">
      <header className="rise">
        <p className="eyebrow">Pharmacy</p>
        <h1 className="font-display text-4xl md:text-5xl font-extrabold mt-2">Meds &amp; Rx<span className="text-amberx">.</span></h1>
        <p className="text-mist-500 mt-2">Medication identified from your prescription and pill-pack photos.</p>
      </header>

      <div className="rounded-2xl p-5 flex items-start gap-4 border border-amberx/25 bg-amberx/[0.06] rise rise-1">
        <i className="fas fa-lightbulb text-amberx text-lg mt-0.5" />
        <p className="text-sm text-mist-300">
          Use <Link to="/analyze" className="text-amberx underline underline-offset-4">Health Analysis → Meds &amp; prescriptions</Link> to photograph a prescription. The AI explains each medicine and it appears here.
        </p>
      </div>

      {medications.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {medications.map((med, i) => (
            <TiltCard key={med.id} className={`panel panel-hover p-6 rise ${i < 4 ? `rise-${i + 1}` : ''}`}>
              <div className="flex justify-between items-start" style={{ transform: 'translateZ(30px)' }}>
                <span className="w-12 h-12 rounded-2xl flex items-center justify-center text-amberx bg-amberx/10 border border-amberx/25">
                  <i className="fas fa-capsules text-lg" />
                </span>
                <span className="font-mono text-[10px] px-2 py-1 rounded-md text-vital bg-vital/10 border border-vital/25">ANALYZED</span>
              </div>
              <h3 className="font-display font-bold text-lg mt-5 line-clamp-1" title={med.summary}>{med.summary.split('.')[0]}</h3>
              <p className="text-sm text-mist-500 mt-2 line-clamp-3">{med.summary}</p>
              <p className="font-mono text-[10px] text-mist-700 mt-5 pt-4 border-t border-white/[0.06]">
                CAPTURED {new Date(med.timestamp).toLocaleDateString()}
              </p>
            </TiltCard>
          ))}
        </div>
      ) : (
        <div className="panel p-14 text-center rise rise-2">
          <div className="w-16 h-16 rounded-2xl bg-ink-800 border border-white/[0.06] flex items-center justify-center mx-auto text-mist-500">
            <i className="fas fa-prescription text-2xl" />
          </div>
          <p className="text-mist-500 mt-5 text-sm">No medications yet. Upload a prescription or medicine photo to begin.</p>
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
        <p className="mb-6 border border-coral/30 bg-coral/10 text-coral rounded-2xl p-4 text-sm">
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
