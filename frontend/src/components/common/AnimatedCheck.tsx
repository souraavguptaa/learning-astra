/** Success checkmark that draws itself in (circle stroke, then check stroke) instead of appearing
 * instantly — used for pass/save/completion moments. Keyframes defined in styles/index.css. */
export function AnimatedCheck({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 52 52"
      className={`animated-check ${className}`}
      role="img"
      aria-label="Success"
    >
      <circle className="animated-check-circle" cx="26" cy="26" r="24" fill="none" strokeWidth="3" />
      <path className="animated-check-mark" fill="none" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" d="M14 27l7 7 17-17" />
    </svg>
  );
}
