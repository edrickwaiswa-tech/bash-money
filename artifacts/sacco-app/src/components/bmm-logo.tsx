interface BmmLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "badge" | "full";
  className?: string;
}

const HEIGHT: Record<string, number> = { sm: 44, md: 60, lg: 100, xl: 200 };

export function BmmLogo({ size = "md", className = "" }: BmmLogoProps) {
  const h = HEIGHT[size] ?? 60;
  return (
    <img
      src="/bmm-logo-transparent.png"
      alt="Bash M. Money Financial Services Ltd"
      style={{
        height: h,
        width: "auto",
        objectFit: "contain",
        flexShrink: 0,
        filter: "drop-shadow(0 2px 14px rgba(0,0,0,0.3))",
      }}
      className={className}
    />
  );
}
