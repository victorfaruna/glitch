export function GlitchMark({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      width="28"
      height="28"
      viewBox="0 0 28 28"
      fill="none"
      aria-hidden="true"
    >
      <rect width="28" height="28" rx="8" fill="currentColor" />
      <path d="M8 8h5v4h-3v4h8v-3h-4V9h7v10h-4v3H8V8Z" fill="white" />
      <path d="M5 13h4v4H5zM19 5h4v4h-4z" fill="white" fillOpacity=".7" />
    </svg>
  );
}
