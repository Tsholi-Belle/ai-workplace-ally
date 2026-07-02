import { Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSpeechToText } from "@/hooks/use-speech-to-text";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useRef } from "react";

interface MicButtonProps {
  /** Called when transcript text is ready. Receives the appended chunk. */
  onAppend: (text: string) => void;
  className?: string;
  size?: "sm" | "icon";
  label?: string;
}

export function MicButton({ onAppend, className, size = "icon", label }: MicButtonProps) {
  // Track the last interim length per session so we only append deltas
  const finalizedRef = useRef("");

  const { listening, supported, toggle } = useSpeechToText({
    onTranscript: (text, isFinal) => {
      if (isFinal) {
        const chunk = text.trim();
        if (chunk) {
          onAppend((finalizedRef.current ? " " : "") + chunk);
          finalizedRef.current += " " + chunk;
        }
      }
    },
  });

  const handleClick = () => {
    if (!supported) {
      toast.error("Voice input isn't supported in this browser. Try Chrome or Edge.");
      return;
    }
    finalizedRef.current = "";
    toggle();
  };

  return (
    <Button
      type="button"
      variant={listening ? "default" : "outline"}
      size={size}
      onClick={handleClick}
      className={cn(
        listening &&
          "bg-fuchsia-600 hover:bg-fuchsia-600/90 text-white border-fuchsia-600 shadow-[0_0_0_4px_rgba(217,70,239,0.25)] animate-pulse",
        className,
      )}
      aria-label={listening ? "Stop voice input" : "Start voice input"}
      title={listening ? "Recording — click to stop" : "Voice input"}
    >
      <Mic className="h-4 w-4" />
      {label && <span className="ml-1">{listening ? "Recording" : label}</span>}
    </Button>
  );
}
