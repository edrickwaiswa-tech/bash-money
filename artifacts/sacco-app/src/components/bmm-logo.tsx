import { BmmCircularLogo } from "./bmm-circular-logo";

interface BmmLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "badge" | "full";
  className?: string;
}

export function BmmLogo({ size = "md", variant = "badge", className = "" }: BmmLogoProps) {
  const dims: Record<string, number> = { sm: 36, md: 46, lg: 68, xl: 144 };
  const px = dims[size] ?? 46;

  if (variant === "badge") {
    return <BmmCircularLogo size={px} className={className} />;
  }

  const textPx: Record<string, number> = { sm: 11, md: 13, lg: 16, xl: 20 };
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <BmmCircularLogo size={px} className="flex-shrink-0" />
      <span
        className="font-black text-white leading-tight whitespace-nowrap overflow-hidden text-ellipsis"
        style={{ fontSize: textPx[size] ?? 13, letterSpacing: "0.06em", textTransform: "uppercase" }}
      >
        Bash M. Money Financial Services Ltd
      </span>
    </div>
  );
}
