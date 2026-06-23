import { cn } from '@/lib/utils';
import React from 'react';

export function FeatureCard({ feature, className, ...props }) {
  const p = genRandomPattern();

  return (
    <div className={cn('relative overflow-hidden p-6', className)} {...props}>
      <div className="pointer-events-none absolute top-0 left-1/2 -mt-2 -ml-20 h-full w-full [mask-image:linear-gradient(white,transparent)]">
        <div className="absolute inset-0 bg-gradient-to-r from-white/[0.05] to-white/[0.02] [mask-image:radial-gradient(farthest-side_at_top,white,transparent)] opacity-100">
          <GridPattern
            width={20}
            height={20}
            x="-12"
            y="4"
            squares={p}
            className="fill-white/[0.05] stroke-white/[0.1] absolute inset-0 h-full w-full mix-blend-overlay"
          />
        </div>
      </div>
      <feature.icon className="text-neutral-300 size-6" strokeWidth={1} aria-hidden />
      <h3 className="mt-10 text-sm md:text-base text-white font-semibold">{feature.title}</h3>
      <p className="text-neutral-400 relative z-20 mt-2 text-xs font-light leading-relaxed">{feature.description}</p>
    </div>
  );
}

function GridPattern({ width, height, x, y, squares, ...props }) {
  const patternId = React.useId();

  return (
    <svg aria-hidden="true" {...props}>
      <defs>
        <pattern id={patternId} width={width} height={height} patternUnits="userSpaceOnUse" x={x} y={y}>
          <path d={`M.5 ${height}V.5H${width}`} fill="none" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" strokeWidth={0} fill={`url(#${patternId})`} />
      {squares && (
        <svg x={x} y={y} className="overflow-visible">
          {squares.map(([sx, sy], index) => (
            <rect strokeWidth="0" key={index} width={width + 1} height={height + 1} x={sx * width} y={sy * height} />
          ))}
        </svg>
      )}
    </svg>
  );
}

function genRandomPattern(length) {
  length = length ?? 5;
  return Array.from({ length }, () => [
    Math.floor(Math.random() * 4) + 7,
    Math.floor(Math.random() * 6) + 1,
  ]);
}
