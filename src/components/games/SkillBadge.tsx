import { cn } from "@/lib/utils";

interface SkillBadgeProps {
  level: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const skillConfig: Record<number, { label: string; className: string }> = {
  2: { label: "Level 2", className: "badge-beginner" },
  3: { label: "Level 3", className: "badge-intermediate" },
  4: { label: "Level 4", className: "badge-intermediate" },
  5: { label: "Level 5", className: "badge-advanced" },
};

export function SkillBadge({ level, size = "md", className }: SkillBadgeProps) {
  const config = skillConfig[level] || skillConfig[3];

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-3 py-1 text-xs",
    lg: "px-4 py-1.5 text-sm",
  };

  return (
    <span
      className={cn(
        "badge-skill",
        config.className,
        sizeClasses[size],
        className
      )}
    >
      {config.label}
    </span>
  );
}

export function getSkillLabel(level: number): string {
  const labels: Record<number, string> = {
    2: "Beginner",
    3: "Intermediate",
    4: "Upper-Int",
    5: "Pro",
  };
  return labels[level] || `Level ${level}`;
}
