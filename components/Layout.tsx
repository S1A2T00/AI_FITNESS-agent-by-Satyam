import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Logo } from './Logo';

const NAV = [
  { to: '/', icon: 'fa-house', label: 'Overview', short: 'Home' },
  { to: '/analyze', icon: 'fa-wand-magic-sparkles', label: 'New analysis', short: 'Analyze' },
  { to: '/history', icon: 'fa-clock-rotate-left', label: 'History', short: 'History' },
  { to: '/medicine', icon: 'fa-capsules', label: 'Medications', short: 'Meds' },
  { to: '/coach', icon: 'fa-comment-medical', label: 'Coach', short: 'Coach' },
];

const NavItem: React.FC<{ to: string; icon: string; label: string }> = ({ to, icon, label }) => {
  const active = useLocation().pathname === to;
  return (
    <Link
      to={to}
      aria-current={active ? 'page' : undefined}
      className={`flex items-center gap-3 h-9 px-3 rounded-lg text-sm transition-colors ${
        active ? 'bg-stone-100 text-stone-900 font-medium' : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
      }`}
    >
      <i className={`fas ${icon} w-4 text-center text-[13px] ${active ? 'text-stone-900' : 'text-stone-400'}`} />
      {label}
    </Link>
  );
};

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, role, signOut } = useAuth();
  const { pathname } = useLocation();
  const displayName = user?.displayName || user?.email?.split('@')[0] || 'User';

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-canvas">
      <aside className="hidden md:flex flex-col w-60 shrink-0 bg-white border-r border-line px-3 py-5 sticky top-0 h-screen">
        <Link to="/" className="px-3 mb-8"><Logo /></Link>

        <nav className="flex flex-col gap-0.5">
          {NAV.map((n) => <NavItem key={n.to} {...n} />)}
        </nav>

        {role === 'admin' && (
          <>
            <p className="px-3 mt-8 mb-2 text-xs font-medium text-stone-400">Admin</p>
            <NavItem to="/admin" icon="fa-users" label="Users & roles" />
          </>
        )}

        <div className="mt-auto pt-4 border-t border-line flex items-center gap-3 px-2">
          {user?.photoURL ? (
            <img src={user.photoURL} referrerPolicy="no-referrer" className="w-8 h-8 rounded-full" alt="" />
          ) : (
            <span className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 text-sm font-semibold flex items-center justify-center">
              {displayName.slice(0, 1).toUpperCase()}
            </span>
          )}
          <div className="min-w-0 flex-grow">
            <p className="text-sm font-medium truncate" title={user?.email || ''}>{displayName}</p>
            <p className="text-xs text-stone-500 capitalize">{role}</p>
          </div>
          <button onClick={signOut} title="Sign out" aria-label="Sign out" className="btn btn-ghost !h-8 !px-2">
            <i className="fas fa-arrow-right-from-bracket text-[13px]" />
          </button>
        </div>
      </aside>

      <header className="md:hidden flex items-center justify-between px-4 h-14 bg-white border-b border-line sticky top-0 z-40">
        <Link to="/"><Logo size={26} /></Link>
        <div className="flex items-center">
          {role === 'admin' && <Link to="/admin" className="btn btn-ghost !px-2.5" aria-label="Admin"><i className="fas fa-users" /></Link>}
          <button onClick={signOut} className="btn btn-ghost !px-2.5" aria-label="Sign out"><i className="fas fa-arrow-right-from-bracket" /></button>
        </div>
      </header>

      <main className="flex-grow min-w-0 px-4 py-6 sm:px-6 md:px-10 md:py-10 pb-24 md:pb-10">
        <div className="max-w-5xl mx-auto">{children}</div>
      </main>

      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur border-t border-line flex justify-around h-16 z-40">
        {NAV.map((n) => {
          const active = pathname === n.to;
          return (
            <Link key={n.to} to={n.to} className={`flex flex-col items-center justify-center gap-1 w-16 ${active ? 'text-stone-900' : 'text-stone-400'}`}>
              <i className={`fas ${n.icon} text-[15px]`} />
              <span className="text-[10px] font-medium">{n.short}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};
