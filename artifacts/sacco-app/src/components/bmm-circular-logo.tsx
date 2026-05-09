interface BmmCircularLogoProps {
  size?: number;
  className?: string;
}

export function BmmCircularLogo({ size = 120, className = "" }: BmmCircularLogoProps) {
  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Bash M. Money Financial Services Ltd"
    >
      <defs>
        {/* Metallic gold shimmer — diagonal highlight */}
        <linearGradient id="bmmG1" x1="15%" y1="0%" x2="85%" y2="100%">
          <stop offset="0%"   stopColor="#f9eaaa" />
          <stop offset="20%"  stopColor="#d4ae56" />
          <stop offset="45%"  stopColor="#f5d97a" />
          <stop offset="70%"  stopColor="#b8903a" />
          <stop offset="100%" stopColor="#e0c060" />
        </linearGradient>
        {/* Reverse shimmer for inner ring */}
        <linearGradient id="bmmG2" x1="85%" y1="0%" x2="15%" y2="100%">
          <stop offset="0%"   stopColor="#f9eaaa" />
          <stop offset="50%"  stopColor="#c9a144" />
          <stop offset="100%" stopColor="#8b6520" />
        </linearGradient>
        {/* Navy depth gradient */}
        <radialGradient id="bmmNavy" cx="42%" cy="32%" r="70%">
          <stop offset="0%"   stopColor="#1e3f7a" />
          <stop offset="100%" stopColor="#0b1d4e" />
        </radialGradient>
        {/* Subtle light shimmer overlay */}
        <linearGradient id="bmmShimmer" x1="0%" y1="0%" x2="65%" y2="100%">
          <stop offset="0%"   stopColor="white" stopOpacity="0.12" />
          <stop offset="45%"  stopColor="white" stopOpacity="0.04" />
          <stop offset="100%" stopColor="white" stopOpacity="0"    />
        </linearGradient>
        {/* Top arc — counterclockwise (sweep=0) → path goes via top → text upright */}
        <path id="bmmTop" d="M 22,100 a 78,78 0 0,0 156,0" />
        {/* Bottom arc — clockwise (sweep=1) → path goes via bottom → text upright */}
        <path id="bmmBot" d="M 30,100 a 70,70 0 0,1 140,0" />
      </defs>

      {/* ── Outer metallic gold border ring ── */}
      <circle cx="100" cy="100" r="99"   fill="url(#bmmG1)" />
      {/* Dark separator gap */}
      <circle cx="100" cy="100" r="91"   fill="#0c1d4e" />
      {/* Inner gold ring */}
      <circle cx="100" cy="100" r="88.5" fill="url(#bmmG2)" />
      {/* Main navy background */}
      <circle cx="100" cy="100" r="84"   fill="url(#bmmNavy)" />
      {/* Shimmer overlay */}
      <circle cx="100" cy="100" r="84"   fill="url(#bmmShimmer)" />

      {/* Thin decorative accent ring — separates text from monogram */}
      <circle cx="100" cy="100" r="73.5"
        fill="none" stroke="url(#bmmG1)" strokeWidth="0.6" opacity="0.45" />

      {/* ── BMM Monogram ── */}
      {/* Shadow for depth */}
      <text x="101" y="117" textAnchor="middle"
        fontFamily="Cinzel, Georgia, 'Times New Roman', serif"
        fontSize="50" fontWeight="700"
        fill="#060f2a" opacity="0.45" letterSpacing="-1">
        BMM
      </text>
      {/* Main gold monogram */}
      <text x="100" y="116" textAnchor="middle"
        fontFamily="Cinzel, Georgia, 'Times New Roman', serif"
        fontSize="50" fontWeight="700"
        fill="url(#bmmG1)" letterSpacing="-1">
        BMM
      </text>

      {/* ── Curved company name — TOP: BASH M. MONEY ── */}
      <text fontFamily="Cinzel, Georgia, 'Palatino Linotype', serif"
        fontSize="9" fontWeight="700"
        fill="url(#bmmG1)" letterSpacing="3.5">
        <textPath href="#bmmTop" startOffset="50%" textAnchor="middle">
          BASH M. MONEY
        </textPath>
      </text>

      {/* ── Curved sub-name — BOTTOM: AND FINANCIAL SERVICES LTD ── */}
      <text fontFamily="'Helvetica Neue', Arial, Helvetica, sans-serif"
        fontSize="6.5"
        fill="#c9a144" letterSpacing="2.2" opacity="0.88">
        <textPath href="#bmmBot" startOffset="50%" textAnchor="middle">
          AND FINANCIAL SERVICES LTD
        </textPath>
      </text>
    </svg>
  );
}
