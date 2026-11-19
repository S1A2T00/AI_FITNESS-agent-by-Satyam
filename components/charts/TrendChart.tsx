// Single-series time chart (SVG, no dependencies).
// Specs: 2px line, 10% area wash, hairline solid grid, ≥8px dots with a 2px
// surface ring, end-value label, crosshair + tooltip on hover and keyboard.
import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';

export interface TrendPoint {
  date: Date;
  value: number;
  /** Extra line in the tooltip, e.g. a status label. */
  note?: string;
}

const SERIES = '#059669'; // validated: contrast ≥ 3:1 on white
const GRID = '#EEECE9';
const INK_MUTED = '#78716C';
const SURFACE = '#FFFFFF';

const fmtDate = (d: Date, withYear = false) =>
  d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', ...(withYear ? { year: 'numeric' } : {}) });

/** Round axis ticks to clean numbers. */
function niceTicks(min: number, max: number, count = 3): number[] {
  if (min === max) {
    const pad = Math.abs(min) * 0.1 || 1;
    min -= pad;
    max += pad;
  }
  const raw = (max - min) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Number(v.toFixed(6)));
  return ticks;
}

export const TrendChart: React.FC<{
  points: TrendPoint[];
  height?: number;
  unit?: string;
  /** Fix the y-domain (e.g. 0–100 for a score). */
  domain?: [number, number];
  format?: (v: number) => string;
  label: string;
  compact?: boolean;
}> = ({ points, height = 160, unit = '', domain, format = (v) => String(Math.round(v * 10) / 10), label, compact }) => {
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<number | null>(null);

  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pad = { top: 14, right: compact ? 12 : 44, bottom: compact ? 8 : 24, left: compact ? 8 : 36 };
  const innerW = Math.max(0, width - pad.left - pad.right);
  const innerH = height - pad.top - pad.bottom;

  const geo = useMemo(() => {
    if (!points.length || innerW <= 0) return null;
    const values = points.map((p) => p.value);
    const ticks = domain ? niceTicks(domain[0], domain[1], 4) : niceTicks(Math.min(...values), Math.max(...values));
    const yMin = ticks[0];
    const yMax = ticks[ticks.length - 1];
    const t0 = points[0].date.getTime();
    const t1 = points[points.length - 1].date.getTime();
    const x = (d: Date) => (t1 === t0 ? innerW / 2 : ((d.getTime() - t0) / (t1 - t0)) * innerW);
    const y = (v: number) => innerH - ((v - yMin) / (yMax - yMin || 1)) * innerH;
    const xy = points.map((p) => [x(p.date), y(p.value)] as const);
    const line = xy.map(([px, py], i) => `${i ? 'L' : 'M'}${px.toFixed(1)},${py.toFixed(1)}`).join(' ');
    const area = xy.length > 1 ? `${line} L${xy[xy.length - 1][0].toFixed(1)},${innerH} L${xy[0][0].toFixed(1)},${innerH} Z` : '';
    return { ticks, y, xy, line, area };
  }, [points, innerW, innerH, domain]);

  const nearest = (clientX: number) => {
    if (!geo || !wrap.current) return null;
    const left = wrap.current.getBoundingClientRect().left + pad.left;
    const px = clientX - left;
    let best = 0;
    geo.xy.forEach(([x], i) => {
      if (Math.abs(x - px) < Math.abs(geo.xy[best][0] - px)) best = i;
    });
    return best;
  };

  const last = points.length - 1;
  const active = hover ?? null;
  const summary = points.length
    ? `${label}: ${points.length} readings from ${fmtDate(points[0].date, true)} to ${fmtDate(points[last].date, true)}, latest ${format(points[last].value)}${unit ? ' ' + unit : ''}.`
    : `${label}: no readings.`;

  return (
    <div ref={wrap} className="relative w-full select-none" style={{ height }}>
      {geo && (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={summary}
          tabIndex={0}
          className="block outline-none focus-visible:ring-2 focus-visible:ring-stone-900/20 rounded-lg"
          onPointerMove={(e) => setHover(nearest(e.clientX))}
          onPointerLeave={() => setHover(null)}
          onFocus={() => setHover(last)}
          onBlur={() => setHover(null)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') setHover((h) => Math.max(0, (h ?? last) - 1));
            if (e.key === 'ArrowRight') setHover((h) => Math.min(last, (h ?? last) + 1));
          }}
        >
          <g transform={`translate(${pad.left},${pad.top})`}>
            {/* recessive grid + y ticks */}
            {geo.ticks.map((t) => (
              <g key={t}>
                <line x1={0} x2={innerW} y1={geo.y(t)} y2={geo.y(t)} stroke={GRID} strokeWidth={1} />
                {!compact && (
                  <text x={-8} y={geo.y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill={INK_MUTED} style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {format(t)}
                  </text>
                )}
              </g>
            ))}

            {/* x labels: first and last date only */}
            {!compact && (
              <>
                <text x={geo.xy[0][0]} y={innerH + 17} textAnchor={points.length > 1 ? 'start' : 'middle'} fontSize={11} fill={INK_MUTED}>
                  {fmtDate(points[0].date)}
                </text>
                {points.length > 1 && (
                  <text x={geo.xy[last][0]} y={innerH + 17} textAnchor="end" fontSize={11} fill={INK_MUTED}>
                    {fmtDate(points[last].date)}
                  </text>
                )}
              </>
            )}

            {geo.area && <path d={geo.area} fill={SERIES} opacity={0.1} />}
            {points.length > 1 && <path d={geo.line} fill="none" stroke={SERIES} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />}

            {/* crosshair */}
            {active !== null && (
              <line x1={geo.xy[active][0]} x2={geo.xy[active][0]} y1={0} y2={innerH} stroke="#A8A29E" strokeWidth={1} />
            )}

            {/* dots: every reading, ringed in the surface colour */}
            {geo.xy.map(([x, y], i) => (
              <circle
                key={i}
                cx={x}
                cy={y}
                r={i === active || i === last ? 5 : 4}
                fill={SERIES}
                stroke={SURFACE}
                strokeWidth={2}
              />
            ))}

            {/* end label: the latest value only */}
            {!compact && (
              <text x={geo.xy[last][0] + 9} y={geo.xy[last][1]} dy="0.32em" fontSize={12} fontWeight={600} fill="#1C1917" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {format(points[last].value)}
              </text>
            )}
          </g>
        </svg>
      )}

      {/* tooltip: value leads, date + note follow */}
      {geo && active !== null && (
        <div
          role="status"
          className="pointer-events-none absolute z-10 rounded-lg bg-white px-2.5 py-1.5 text-xs shadow-lift ring-1 ring-black/5 whitespace-nowrap"
          style={{
            left: Math.min(Math.max(pad.left + geo.xy[active][0], 60), width - 60),
            top: Math.max(0, pad.top + geo.xy[active][1] - 52),
            transform: 'translateX(-50%)',
          }}
        >
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-0.5 rounded" style={{ background: SERIES }} />
            <span className="font-semibold text-stone-900 tnum">{format(points[active].value)}{unit ? (unit === '%' ? '%' : ` ${unit}`) : ''}</span>
          </div>
          <div className="text-stone-500 mt-0.5">
            {fmtDate(points[active].date, true)}{points[active].note ? ` · ${points[active].note}` : ''}
          </div>
        </div>
      )}
    </div>
  );
};
