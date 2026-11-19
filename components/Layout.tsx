import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Logo } from './Logo';

const NAV = [
  { to: '/', icon: 'fa-house', label: 'Overview' },
  { to: '/analyze', icon: 'fa-wand-magic-sparkles', label: 'Analyze' },
  { to: '/progress', icon: 'fa-chart-line', label: 'Progress' },
  { to: '/history', icon: 'fa-clock-rotate-left', label: 'History' },
  { to: '/medicine', icon: 'fa-capsules', label: 'Meds' },
  { to: '/coach', icon: 'fa-comment-medical', label: 'Coach' },
];

// Only Chromium renders SVG filters inside backdrop-filter (the refraction).
const canRefract = (() => {
  const brands = (navigator as Navigator & { userAgentData?: { brands?: { brand: string }[] } }).userAgentData?.brands;
  return !!brands?.some((b) => b.brand === 'Chromium');
})();

/** Floating liquid-glass capsule navigation, bottom centre. */
const CapsuleNav: React.FC = () => {
  const { pathname } = useLocation();
  const wrap = useRef<HTMLDivElement>(null);
  const items = useRef<(HTMLAnchorElement | null)[]>([]);
  const [pill, setPill] = useState<{ x: number; w: number } | null>(null);
  const activeIndex = NAV.findIndex((n) => n.to === pathname);

  useLayoutEffect(() => {
    const measure = () => {
      const el = items.current[activeIndex];
      setPill(el ? { x: el.offsetLeft, w: el.offsetWidth } : null);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (wrap.current) ro.observe(wrap.current);
    return () => ro.disconnect();
  }, [activeIndex]);

  return (
    <nav
      aria-label="Main"
      className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-[calc(100vw-24px)]"
    >
      <div ref={wrap} className={`liquid-glass ${canRefract ? 'refract' : ''} relative flex items-center gap-0.5 p-1.5 rounded-full`}>
        {pill && (
          <span
            aria-hidden="true"
            className="liquid-pill absolute top-1.5 bottom-1.5 left-0 rounded-full"
            style={{ transform: `translateX(${pill.x}px)`, width: pill.w }}
          />
        )}
        {NAV.map((n, i) => {
          const active = i === activeIndex;
          return (
            <Link
              key={n.to}
              to={n.to}
              ref={(el) => {
                items.current[i] = el;
              }}
              aria-current={active ? 'page' : undefined}
              aria-label={n.label}
              className={`relative z-10 h-11 rounded-full flex items-center justify-center gap-2 transition-colors ${
                active ? 'text-stone-900 px-4' : 'text-stone-500 hover:text-stone-900 px-3.5 sm:px-4'
              }`}
            >
              <i className={`fas ${n.icon} text-[15px]`} />
              <span className={`text-sm font-medium ${active ? 'inline' : 'hidden sm:inline'}`}>{n.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

/** Avatar button with a small glass popover: who you are, admin link, sign out. */
const AccountMenu: React.FC = () => {
  const { user, role, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const displayName = user?.displayName || user?.email?.split('@')[0] || 'User';

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`liquid-glass ${canRefract ? 'refract' : ''} rounded-full p-1.5 pr-3.5 flex items-center gap-2 text-sm font-medium`}
      >
        {user?.photoURL ? (
          <img src={user.photoURL} referrerPolicy="no-referrer" className="w-7 h-7 rounded-full" alt="" />
        ) : (
          <span className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 text-xs font-semibold flex items-center justify-center">
            {displayName.slice(0, 1).toUpperCase()}
          </span>
        )}
        <span className="hidden sm:inline max-w-[10rem] truncate">{displayName}</span>
        <i className={`fas fa-chevron-down text-[10px] text-stone-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div role="menu" className="liquid-glass absolute right-0 mt-2 w-60 rounded-2xl p-1.5 fade-up">
          <div className="px-3 py-2.5">
            <p className="text-sm font-medium truncate">{displayName}</p>
            <p className="text-xs text-stone-500 truncate">{user?.email}</p>
            <span className="pill pill-neutral mt-2 capitalize">{role}</span>
          </div>
          <div className="h-px bg-stone-900/10 my-1" />
          {role === 'admin' && (
            <Link role="menuitem" to="/admin" onClick={() => setOpen(false)} className="flex items-center gap-3 h-9 px-3 rounded-xl text-sm hover:bg-white/70">
              <i className="fas fa-users w-4 text-center text-stone-500 text-xs" /> Users &amp; roles
            </Link>
          )}
          <button role="menuitem" onClick={signOut} className="w-full flex items-center gap-3 h-9 px-3 rounded-xl text-sm hover:bg-white/70 text-left">
            <i className="fas fa-arrow-right-from-bracket w-4 text-center text-stone-500 text-xs" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
};

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen bg-canvas">
    <header className="sticky top-0 z-40 px-4 sm:px-6 md:px-10 pt-3 pb-2 bg-gradient-to-b from-canvas via-canvas/85 to-canvas/0">
      <div className="max-w-5xl mx-auto h-12 flex items-center justify-between">
        <Link to="/" aria-label="Vitalis home" className={`liquid-glass ${canRefract ? 'refract' : ''} rounded-full py-1.5 pl-1.5 pr-4`}>
          <Logo />
        </Link>
        <AccountMenu />
      </div>
    </header>

    <main className="px-4 sm:px-6 md:px-10 pt-4 md:pt-6 pb-32">
      <div className="max-w-5xl mx-auto">{children}</div>
    </main>

    <CapsuleNav />
  </div>
);
