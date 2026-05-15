interface BmmLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const HEIGHT: Record<string, number> = { sm: 44, md: 60, lg: 100, xl: 180 };

export function BmmLogo({ size = "md", className = "" }: BmmLogoProps) {
  const h = HEIGHT[size] ?? 60;
  return (
    <img
      src="/logo.png"
      alt="Bash M. Money And Financial Services Ltd"
      style={{
        height: h,
        width: "auto",
        objectFit: "contain",
        flexShrink: 0,
      }}
      className={className}
    />
  );
}
