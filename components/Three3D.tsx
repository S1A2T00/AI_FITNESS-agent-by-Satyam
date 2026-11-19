import React, { Suspense, lazy, useRef } from 'react';

// Lazy-loaded so three.js only downloads when a 3D element is actually shown.
const HelixSceneLazy = lazy(() => import('./three/Scenes').then((m) => ({ default: m.HelixScene })));
const OrbSceneLazy = lazy(() => import('./three/Scenes').then((m) => ({ default: m.OrbScene })));

/** Soft glow shown while the 3D chunk loads (and if WebGL fails). */
const Glow: React.FC = () => (
  <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
    <div className="w-2/3 aspect-square rounded-full bg-vital/20 blur-3xl" />
  </div>
);

class WebGLBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <Glow /> : this.props.children;
  }
}

// Positioned wrapper: keep the caller's absolute/fixed if given, else relative.
const pos = (className: string) => (/\b(absolute|fixed)\b/.test(className) ? className : `relative ${className}`);

export const DnaHelix: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={pos(className)} aria-hidden="true">
    <WebGLBoundary>
      <Suspense fallback={<Glow />}>
        <HelixSceneLazy />
      </Suspense>
    </WebGLBoundary>
  </div>
);

export const VitalOrb: React.FC<{ className?: string; score?: number; active?: boolean }> = ({
  className = '',
  score,
  active,
}) => (
  <div className={pos(className)} aria-hidden="true">
    <WebGLBoundary>
      <Suspense fallback={<Glow />}>
        <OrbSceneLazy score={score} active={active} />
      </Suspense>
    </WebGLBoundary>
  </div>
);

/** Card that tilts toward the cursor in 3D (CSS only, no WebGL). */
export const TiltCard: React.FC<React.HTMLAttributes<HTMLDivElement> & { max?: number }> = ({
  max = 7,
  className = '',
  children,
  style,
  ...rest
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(900px) rotateX(${-py * max}deg) rotateY(${px * max}deg) translateZ(0)`;
    el.style.setProperty('--gx', `${(px + 0.5) * 100}%`);
    el.style.setProperty('--gy', `${(py + 0.5) * 100}%`);
  };
  const reset = () => {
    if (ref.current) ref.current.style.transform = '';
  };
  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={reset}
      className={`relative transition-transform duration-200 ease-out will-change-transform ${className}`}
      style={{ transformStyle: 'preserve-3d', ...style }}
      {...rest}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit]"
        style={{
          background:
            'radial-gradient(420px circle at var(--gx,50%) var(--gy,0%), rgba(79,240,180,0.08), transparent 40%)',
        }}
      />
      {children}
    </div>
  );
};
