/**
 * Placeholder crest shown until `public/logo.png` exists. The real logo is
 * layered on top as a background image, so dropping the file in replaces this
 * with no code change.
 */
export function AcademiaMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <linearGradient id="academia-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e3c766" />
          <stop offset="50%" stopColor="#c9a227" />
          <stop offset="100%" stopColor="#9c7a1a" />
        </linearGradient>
      </defs>

      {/* crest field */}
      <circle cx="32" cy="32" r="30" fill="#16233d" />
      <circle cx="32" cy="32" r="30" fill="none" stroke="url(#academia-gold)" strokeWidth="2.5" />
      <circle cx="32" cy="32" r="24.5" fill="none" stroke="url(#academia-gold)" strokeWidth="1" opacity="0.65" />

      {/* laurel sprigs */}
      <g stroke="url(#academia-gold)" strokeWidth="1.4" fill="none" opacity="0.9">
        <path d="M18 44a20 20 0 0 1-2.5-16" strokeLinecap="round" />
        <path d="M46 44a20 20 0 0 0 2.5-16" strokeLinecap="round" />
      </g>
      <g fill="url(#academia-gold)" opacity="0.85">
        {[0, 1, 2, 3].map((i) => (
          <ellipse key={`l${i}`} cx={15.6 + i * 0.9} cy={40 - i * 5} rx="2.4" ry="1.3"
            transform={`rotate(${-40 + i * 6} ${15.6 + i * 0.9} ${40 - i * 5})`} />
        ))}
        {[0, 1, 2, 3].map((i) => (
          <ellipse key={`r${i}`} cx={48.4 - i * 0.9} cy={40 - i * 5} rx="2.4" ry="1.3"
            transform={`rotate(${40 - i * 6} ${48.4 - i * 0.9} ${40 - i * 5})`} />
        ))}
      </g>

      {/* crown */}
      <path
        d="M26 17.5l3 4 3-5 3 5 3-4v3.5H26z"
        fill="url(#academia-gold)"
      />

      {/* monogram */}
      <path
        d="M32 27.5l8.5 19h-4.2l-1.7-4h-5.2l-1.7 4h-4.2z M30.9 39h2.2l-1.1-2.8z"
        fill="url(#academia-gold)"
      />
    </svg>
  );
}
