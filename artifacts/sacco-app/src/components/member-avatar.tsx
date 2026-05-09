import { useState } from "react";

interface MemberAvatarProps {
  name: string;
  photoUrl?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  onClick?: () => void;
}

const SIZES = {
  sm:  { container: "w-10 h-10",  text: "text-sm",  border: "border-2" },
  md:  { container: "w-12 h-12",  text: "text-sm",  border: "border-2" },
  lg:  { container: "w-20 h-20",  text: "text-xl",  border: "border-[3px]" },
  xl:  { container: "w-24 h-24",  text: "text-3xl", border: "border-[3px]" },
};

export function MemberAvatar({ name, photoUrl, size = "md", className = "", onClick }: MemberAvatarProps) {
  const [imgError, setImgError] = useState(false);

  const initials = name
    .trim()
    .split(/\s+/)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");

  const { container, text, border } = SIZES[size];
  const hasPhoto = !!photoUrl && !imgError;

  const inner = hasPhoto ? (
    <img
      src={photoUrl!}
      alt={name}
      className="w-full h-full object-cover"
      onError={() => setImgError(true)}
    />
  ) : (
    <span className={`font-black text-[#0f2557] select-none ${text}`}>{initials}</span>
  );

  return (
    <div
      className={`rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center bg-[#0f2557]/5 ${border} border-[#c9a144]/30 ${container} ${className} ${onClick ? "cursor-pointer" : ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
    >
      {inner}
    </div>
  );
}
