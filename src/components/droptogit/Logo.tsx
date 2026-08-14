import { useId } from "react";

/**
 * DropToGit logo.
 *
 * The mark communicates three ideas at once:
 *  - A downward "drop" arrow (drag & drop).
 *  - A Git commit node the arrow lands in (developer workflow).
 *  - A light-blue branch line splitting off (Git branching / transfer).
 *
 * Brand palette: dark charcoal badge, fresh-green primary, light-blue accent,
 * white highlights — works on both light and dark backgrounds thanks to the
 * self-contained charcoal badge + gradient ring.
 */

export function LogoMark({
  size = 40,
  className,
}: {
  size?: number;
  className?: string;
}) {
  const id = useId().replace(/:/g, "");
  const bg = `dtg-bg-${id}`;
  const ring = `dtg-ring-${id}`;
  const arrow = `dtg-arrow-${id}`;
  const node = `dtg-node-${id}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      role="img"
      aria-label="DropToGit logo"
      className={className}
    >
      <defs>
        <linearGradient id={bg} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1c2226" />
          <stop offset="1" stopColor="#0e1215" />
        </linearGradient>
        <linearGradient id={ring} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3ee07f" />
          <stop offset="0.55" stopColor="#36c9b4" />
          <stop offset="1" stopColor="#56b6f7" />
        </linearGradient>
        <linearGradient id={arrow} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8ef5a8" />
          <stop offset="1" stopColor="#28bd5c" />
        </linearGradient>
        <radialGradient id={node} cx="0.35" cy="0.3" r="0.85">
          <stop offset="0" stopColor="#9af7b3" />
          <stop offset="1" stopColor="#23b85a" />
        </radialGradient>
      </defs>

      {/* Badge */}
      <rect
        x="3"
        y="3"
        width="42"
        height="42"
        rx="12"
        fill={`url(#${bg})`}
        stroke={`url(#${ring})`}
        strokeWidth="1.6"
      />

      {/* Branch line + secondary node (light blue) */}
      <path
        d="M24 35.5 C 29 35.5, 30 30.5, 33 30"
        fill="none"
        stroke="#56b6f7"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle cx="33" cy="30" r="2.6" fill="#56b6f7" />
      <circle cx="33" cy="30" r="2.6" fill="none" stroke="#0e1215" strokeWidth="0.6" />

      {/* Drop arrow */}
      <rect
        x="21.6"
        y="10.5"
        width="4.8"
        height="13.5"
        rx="2.4"
        fill={`url(#${arrow})`}
      />
      <path
        d="M15.5 21 L24 30 L32.5 21"
        fill="none"
        stroke={`url(#${arrow})`}
        strokeWidth="4.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Commit node the arrow lands in */}
      <circle
        cx="24"
        cy="35.5"
        r="5"
        fill={`url(#${node})`}
        stroke="#0e1215"
        strokeWidth="1.6"
      />
    </svg>
  );
}

export function Logo({
  size = 40,
  className,
  showText = true,
}: {
  size?: number;
  className?: string;
  showText?: boolean;
}) {
  return (
    <div className={`flex items-center gap-2.5 ${className ?? ""}`}>
      <LogoMark size={size} />
      {showText && (
        <span className="text-lg font-bold tracking-tight">
          Drop<span className="text-gradient-green">ToGit</span>
        </span>
      )}
    </div>
  );
}
