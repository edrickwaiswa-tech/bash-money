interface BmmLogoProps {
  size?: "sm" | "md" | "lg";
  variant?: "badge" | "full";
}

export function BmmLogo({ size = "md", variant = "badge" }: BmmLogoProps) {
  const dims = { sm: 32, md: 40, lg: 56 }[size];
  const font = { sm: 9, md: 11, lg: 15 }[size];

  const badge = (
    <div
      style={{ width: dims, height: dims }}
      className="relative flex-shrink-0 flex items-center justify-center rounded-[8px] overflow-hidden"
      aria-label="BMM logo"
    >
      {/* Navy background */}
      <div className="absolute inset-0 bg-[#0f2557]" />
      {/* Gold inner border line */}
      <div className="absolute inset-[3px] rounded-[5px] border border-[#c9a144]/60" />
      {/* Monogram */}
      <span
        className="relative z-10 font-black tracking-tight text-[#c9a144] leading-none select-none"
        style={{ fontSize: font, letterSpacing: "0.04em" }}
      >
        BMM
      </span>
    </div>
  );

  if (variant === "badge") return badge;

  return (
    <div className="flex items-center gap-2.5">
      {badge}
      <div className="leading-tight">
        <p className="font-black text-[#0f2557] tracking-tight text-sm leading-none">
          Bash M. Money
        </p>
        <p className="text-[9px] text-[#c9a144] font-semibold tracking-[0.1em] uppercase leading-tight">
          Financial Services Ltd
        </p>
      </div>
    </div>
  );
}
