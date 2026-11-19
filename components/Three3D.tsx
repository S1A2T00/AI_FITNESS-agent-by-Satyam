import React, { Suspense, lazy } from 'react';

// Lazy-loaded so three.js only downloads when the 3D element is on screen.
const SculptureSceneLazy = lazy(() => import('./three/Scenes').then((m) => ({ default: m.SculptureScene })));

/** Soft placeholder while the 3D chunk loads, and the fallback without WebGL. */
const Placeholder: React.FC = () => (
  <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
    <div className="w-1/2 aspect-square rounded-full bg-gradient-to-br from-brand-100 to-stone-100" />
  </div>
);

class WebGLBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <Placeholder /> : this.props.children;
  }
}

/** Matte ceramic 3D form. `score` adds a progress ring; `active` makes it move more. */
export const Sculpture: React.FC<{
  className?: string;
  score?: number;
  active?: boolean;
  color?: string;
  zoom?: number;
}> = ({ className = '', ...props }) => (
  // Keep the caller's absolute/fixed positioning; otherwise be relative.
  <div className={/\b(absolute|fixed)\b/.test(className) ? className : `relative ${className}`} aria-hidden="true">
    <WebGLBoundary>
      <Suspense fallback={<Placeholder />}>
        <SculptureSceneLazy {...props} />
      </Suspense>
    </WebGLBoundary>
  </div>
);
