import { cn } from "@/lib/utils";
import { MEMBER_PALETTE } from "./palette";

export function ColourPicker({
  value,
  onChange,
  disabled,
  size = "md",
}: {
  value: string;
  onChange: (colour: string) => void;
  disabled?: boolean;
  size?: "sm" | "md";
}) {
  const dot = size === "sm" ? "h-5 w-5" : "h-6 w-6";
  return (
    <div className="flex flex-wrap gap-1.5">
      {MEMBER_PALETTE.map((c) => {
        const active = c.toLowerCase() === value.toLowerCase();
        return (
          <button
            key={c}
            type="button"
            disabled={disabled}
            onClick={() => onChange(c)}
            aria-label={`Colour ${c}`}
            className={cn(
              "rounded-full ring-offset-2 ring-offset-background transition-all",
              dot,
              active ? "ring-2 ring-foreground scale-110" : "ring-1 ring-border hover:scale-105",
              disabled && "opacity-50 cursor-not-allowed",
            )}
            style={{ backgroundColor: c }}
          />
        );
      })}
    </div>
  );
}
