
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NavItem: React.FC<{ to: string; icon: string; label: string }> = ({ to, icon, label }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  
  return (
    <Link
      to={to}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
        isActive 
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
          : 'text-slate-500 hover:bg-slate-100'
      }`}
    >
      <i className={`fas ${icon} text-lg`}></i>
      <span className="font-medium">{label}</span>
    </Link>
  );
};

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, role, signOut } = useAuth();
  const displayName = user?.displayName || user?.email?.split('@')[0] || 'User';
  const initials = displayName.slice(0, 1).toUpperCase();

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50">
      {/* Sidebar - Hidden on mobile */}
      <aside className="hidden md:flex flex-col w-64 glass border-r border-slate-200 p-6 sticky top-0 h-screen">
        <div className="flex items-center gap-2 mb-10 px-2">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white">
            <i className="fas fa-heart-pulse text-xl"></i>
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-800">Vitalis AI</span>
        </div>
        
        <nav className="flex flex-col gap-2 flex-grow">
          <NavItem to="/" icon="fa-chart-pie" label="Dashboard" />
          <NavItem to="/analyze" icon="fa-magnifying-glass-chart" label="Health Analysis" />
          <NavItem to="/medicine" icon="fa-pills" label="Meds & Rx" />
          <NavItem to="/coach" icon="fa-user-doctor" label="AI Coach" />
          <NavItem to="/history" icon="fa-clock-rotate-left" label="Health History" />
          {role === 'admin' && <NavItem to="/admin" icon="fa-user-shield" label="Admin" />}
        </nav>
        
        <div className="mt-auto pt-6 border-t border-slate-200">
          <div className="flex items-center gap-3 px-2">
            {user?.photoURL ? (
              <img src={user.photoURL} referrerPolicy="no-referrer" className="w-10 h-10 rounded-full border border-slate-200" alt="Profile" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center">{initials}</div>
            )}
            <div className="min-w-0 flex-grow">
              <p className="text-sm font-semibold truncate" title={user?.email || ''}>{displayName}</p>
              <p className="text-xs text-slate-500 capitalize">{role}</p>
            </div>
            <button onClick={signOut} title="Sign out" className="text-slate-400 hover:text-red-600 p-2">
              <i className="fas fa-right-from-bracket"></i>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Nav */}
      <header className="md:hidden flex items-center justify-between p-4 bg-white border-b sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white">
            <i className="fas fa-heart-pulse"></i>
          </div>
          <span className="font-bold">Vitalis AI</span>
        </div>
        <button onClick={signOut} title="Sign out" className="text-slate-600 p-2"><i className="fas fa-right-from-bracket text-xl"></i></button>
      </header>

      {/* Main Content */}
      <main className="flex-grow p-4 md:p-8 lg:p-12 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around py-3 px-2 z-50">
        <Link to="/" className="flex flex-col items-center gap-1 text-slate-400"><i className="fas fa-chart-pie"></i><span className="text-[10px]">Home</span></Link>
        <Link to="/analyze" className="flex flex-col items-center gap-1 text-slate-400"><i className="fas fa-magnifying-glass-chart"></i><span className="text-[10px]">Analyze</span></Link>
        <Link to="/coach" className="flex flex-col items-center gap-1 text-slate-400"><i className="fas fa-user-doctor"></i><span className="text-[10px]">Coach</span></Link>
      </nav>
    </div>
  );
};
