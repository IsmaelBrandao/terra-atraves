/** A planet crossed by its diameter — the whole idea of the product in one glyph. */
export function BrandGlyph({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <circle cx="16" cy="16" r="11.5" fill="none" stroke="currentColor" strokeOpacity="0.55" strokeWidth="1.2" />
      <ellipse cx="16" cy="16" rx="11.5" ry="4" fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1" />
      <line x1="16" y1="4.5" x2="16" y2="27.5" stroke="currentColor" strokeWidth="1.2" strokeDasharray="1.5 2.2" />
      <circle cx="16" cy="4.5" r="2.2" fill="#f5c86a" />
      <circle cx="16" cy="27.5" r="2.2" fill="#7fe3f2" />
    </svg>
  );
}
