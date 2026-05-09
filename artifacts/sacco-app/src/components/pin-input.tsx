import { useRef, type KeyboardEvent, type ClipboardEvent } from "react";
import { cn } from "@/lib/utils";

interface PinInputProps {
  length?: number;
  value: string;
  onChange: (val: string) => void;
  onComplete?: (val: string) => void;
  disabled?: boolean;
  className?: string;
  autoFocus?: boolean;
  error?: boolean;
}

export function PinInput({
  length = 4,
  value,
  onChange,
  onComplete,
  disabled = false,
  className,
  autoFocus = false,
  error = false,
}: PinInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const digits = value.split("").concat(Array(length).fill("")).slice(0, length);

  const focus = (i: number) => {
    const el = refs.current[i];
    if (el) { el.focus(); el.select(); }
  };

  const handleChange = (i: number, raw: string) => {
    const digit = raw.replace(/\D/g, "").slice(-1);
    const next = digits.map((d, idx) => (idx === i ? digit : d)).join("").slice(0, length);
    onChange(next);
    if (digit && i < length - 1) focus(i + 1);
    if (next.replace(/\s/g, "").length === length && onComplete) onComplete(next);
  };

  const handleKeyDown = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (digits[i]) {
        const next = digits.map((d, idx) => (idx === i ? "" : d)).join("");
        onChange(next);
      } else if (i > 0) {
        focus(i - 1);
        const next = digits.map((d, idx) => (idx === i - 1 ? "" : d)).join("");
        onChange(next);
      }
    } else if (e.key === "ArrowLeft" && i > 0) {
      focus(i - 1);
    } else if (e.key === "ArrowRight" && i < length - 1) {
      focus(i + 1);
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    onChange(pasted);
    const nextFocus = Math.min(pasted.length, length - 1);
    focus(nextFocus);
    if (pasted.length === length && onComplete) onComplete(pasted);
  };

  return (
    <div className={cn("flex gap-3 justify-center", className)}>
      {Array.from({ length }).map((_, i) => {
        const filled = !!digits[i];
        return (
          <input
            key={i}
            ref={(el) => { refs.current[i] = el; }}
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={digits[i] ?? ""}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            onFocus={(e) => e.target.select()}
            disabled={disabled}
            autoFocus={autoFocus && i === 0}
            className={cn(
              "w-14 h-14 text-center text-2xl font-black rounded-2xl border-2 outline-none transition-all shadow-sm",
              "bg-white",
              error
                ? "border-red-400 bg-red-50 text-red-600 ring-2 ring-red-200"
                : filled
                ? "border-[#0f2557] bg-[#0f2557]/5 text-[#0f2557]"
                : "border-gray-200 text-[#0f2557] focus:border-[#0f2557] focus:ring-2 focus:ring-[#0f2557]/20",
              disabled && "opacity-50 cursor-not-allowed",
            )}
          />
        );
      })}
    </div>
  );
}
