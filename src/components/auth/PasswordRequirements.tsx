import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

export function isPasswordValid(password: string): boolean {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password)
  );
}

const rules = [
  { label: "8+ characters", test: (p: string) => p.length >= 8 },
  { label: "Uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "Lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { label: "A number", test: (p: string) => /[0-9]/.test(p) },
];

export function PasswordRequirements({ password }: { password: string }) {
  if (!password) return null;

  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mt-2">
      {rules.map((r) => {
        const met = r.test(password);
        return (
          <li key={r.label} className="flex items-center gap-1.5">
            {met ? (
              <Check className="w-3 h-3 text-success shrink-0" />
            ) : (
              <Circle className="w-2.5 h-2.5 text-muted-foreground shrink-0" />
            )}
            <span className={cn(met ? "text-success" : "text-muted-foreground")}>
              {r.label}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
