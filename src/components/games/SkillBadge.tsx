import { cn } from "@/lib/utils";

interface SkillBadgeProps {
  level: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const SKILL_LEVELS: Record<number, { label: string; className: string }> = {
  1: { label: "D", className: "badge-beginner" },
  2: { label: "C", className: "badge-intermediate" },
  3: { label: "B", className: "badge-intermediate" },
  4: { label: "A", className: "badge-advanced" },
};

export const SKILL_LEVEL_OPTIONS = [
  { value: 1, label: "D – Beginner" },
  { value: 2, label: "C – Casual" },
  { value: 3, label: "B – Intermediate" },
  { value: 4, label: "A – Advanced" },
];

export function SkillBadge({ level, size = "md", className }: SkillBadgeProps) {
  const config = SKILL_LEVELS[level] ?? SKILL_LEVELS[2];

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-3 py-1 text-xs",
    lg: "px-4 py-1.5 text-sm",
  };

  return (
    <span
      className={cn(
        "badge-skill font-semibold",
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
  return SKILL_LEVELS[level]?.label ?? `${level}`;
}
