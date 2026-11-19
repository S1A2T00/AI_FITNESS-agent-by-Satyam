import React from 'react';

/** Wordmark: a small black tile with a pulse mark, plus "Vitalis". */
export const Logo: React.FC<{ size?: number; wordmark?: boolean }> = ({ size = 28, wordmark = true }) => (
  <span className="inline-flex items-center gap-2.5">
    <span
      className="inline-flex items-center justify-center rounded-lg bg-stone-900 text-white shrink-0"
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 24 24" width={size * 0.58} height={size * 0.58} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 12h4l2.5-6 5 12 2.5-6H21" />
      </svg>
    </span>
    {wordmark && <span className="font-semibold tracking-tight text-stone-900" style={{ fontSize: size * 0.62 }}>Vitalis</span>}
  </span>
);
