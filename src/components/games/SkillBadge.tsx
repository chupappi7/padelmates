import { cn } from "@/lib/utils";

type SkillLevel = "beginner" | "intermediate" | "advanced";

interface SkillBadgeProps {
  level: SkillLevel;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const skillConfig = {
  beginner: {
    label: "Beginner",
    className: "badge-beginner",
  },
  intermediate: {
    label: "Intermediate",
    className: "badge-intermediate",
  },
  advanced: {
    label: "Advanced",
    className: "badge-advanced",
  },
};

export function SkillBadge({ level, size = "md", className }: SkillBadgeProps) {
  const config = skillConfig[level];
  
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
