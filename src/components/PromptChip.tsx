import { cn } from "@/lib/utils";

interface PromptChipProps {
  label: string;
  onClick: () => void;
  className?: string;
}

export function PromptChip({ label, onClick, className }: PromptChipProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-4 py-2 rounded-full text-sm font-medium",
        "bg-secondary/80 text-secondary-foreground",
        "border border-border/50 backdrop-blur-sm",
        "transition-all duration-200",
        "hover:bg-primary/20 hover:border-primary/50 hover:text-primary",
        "hover:scale-105 hover:glow-sm",
        "active:scale-95",
        className
      )}
    >
      {label}
    </button>
  );
}
