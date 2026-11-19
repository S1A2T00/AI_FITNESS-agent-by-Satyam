import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Logo } from '../views/Login';

const NAV = [
  { to: '/', icon: 'fa-chart-pie', label: 'Dashboard', short: 'Home' },
  { to: '/analyze', icon: 'fa-wave-square', label: 'Health Analysis', short: 'Analyze' },
  { to: '/medicine', icon: 'fa-capsules', label: 'Meds & Rx', short: 'Meds' },
  { to: '/coach', icon: 'fa-brain', label: 'AI Coach', short: 'Coach' },
  { to: '/history', icon: 'fa-clock-rotate-left', label: 'Health History', short: 'History' },
];

const NavItem: React.FC<{ to: string; icon: string; label: string }> = ({ to, icon, label }) => {
  const isActive = useLocation().pathname === to;
  return (
    <Link
      to={to}
      aria-current={isActive ? 'page' : undefined}
      className={`group relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
        isActive ? 'text-mist-100 bg-vital/[0.08]' : 'text-mist-500 hover:text-mist-100 hover:bg-white/[0.03]'
      }`}
    >
      {isActive && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-vital shadow-[0_0_12px_#4FF0B4]" />}
      <i className={`fas ${icon} w-5 text-center ${isActive ? 'text-vital' : 'group-hover:text-mist-300'}`} />
      <span className="font-medium">{label}</span>
    </Link>
  );
};

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, role, signOut } = useAuth();
  const { pathname } = useLocation();
  const displayName = user?.displayName || user?.email?.split('@')[0] || 'User';
  const initials = displayName.slice(0, 1).toUpperCase();

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 glass border-r border-white/[0.06] p-5 sticky top-0 h-screen">
        <Link to="/" className="flex items-center gap-3 mb-10 px-2">
          <Logo size={38} />
          <span className="font-display text-xl font-bold tracking-tight">Vitalis<span className="text-vital">.</span>AI</span>
        </Link>

        <p className="eyebrow px-4 mb-3">Workspace</p>
        <nav className="flex flex-col gap-1 flex-grow">
          {NAV.map((n) => <NavItem key={n.to} {...n} />)}
          {role === 'admin' && (
            <>
              <p className="eyebrow px-4 mt-6 mb-3">Admin</p>
              <NavItem to="/admin" icon="fa-user-shield" label="Users & Roles" />
            </>
          )}
        </nav>

        <div className="mt-auto panel !rounded-2xl p-3 flex items-center gap-3">
          {user?.photoURL ? (
            <img src={user.photoURL} referrerPolicy="no-referrer" className="w-10 h-10 rounded-xl" alt="" />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-plasma/20 text-plasma-300 font-display font-bold flex items-center justify-center">{initials}</div>
          )}
          <div className="min-w-0 flex-grow">
            <p className="text-sm font-semibold truncate" title={user?.email || ''}>{displayName}</p>
            <p className="font-mono text-[10px] uppercase tracking-widest text-vital/80">{role}</p>
          </div>
          <button onClick={signOut} title="Sign out" aria-label="Sign out" className="text-mist-500 hover:text-coral p-2 transition-colors">
            <i className="fas fa-arrow-right-from-bracket" />
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 glass border-b border-white/[0.06] sticky top-0 z-50">
        <Link to="/" className="flex items-center gap-2">
          <Logo size={32} />
          <span className="font-display font-bold">Vitalis<span className="text-vital">.</span>AI</span>
        </Link>
        <div className="flex items-center gap-1">
          {role === 'admin' && (
            <Link to="/admin" className="text-mist-300 p-2" aria-label="Admin"><i className="fas fa-user-shield" /></Link>
          )}
          <button onClick={signOut} aria-label="Sign out" className="text-mist-300 p-2"><i className="fas fa-arrow-right-from-bracket" /></button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-grow min-w-0 px-4 py-6 md:p-8 lg:p-12 pb-28 md:pb-12">
        <div className="max-w-6xl mx-auto">{children}</div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-3 left-3 right-3 glass border border-white/[0.08] rounded-2xl flex justify-around py-2 z-50 shadow-2xl">
        {NAV.map((n) => {
          const active = pathname === n.to;
          return (
            <Link key={n.to} to={n.to} className={`flex flex-col items-center gap-1 px-2 py-1 rounded-xl ${active ? 'text-vital' : 'text-mist-500'}`}>
              <i className={`fas ${n.icon}`} />
              <span className="text-[10px] font-medium">{n.short}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};
