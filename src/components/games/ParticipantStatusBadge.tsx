import { cn } from "@/lib/utils";
import { Check, Coins, AlertTriangle, Clock, X } from "lucide-react";

export type ParticipantStatus = 
  | "confirmed_paid"
  | "awaiting_payment"
  | "payment_overdue"
  | "request_pending"
  | "rejected";

interface ParticipantStatusBadgeProps {
  status: ParticipantStatus;
  size?: "sm" | "md";
  className?: string;
}

const statusConfig: Record<ParticipantStatus, {
  icon: typeof Check;
  label: string;
  className: string;
}> = {
  confirmed_paid: {
    icon: Check,
    label: "Paid",
    className: "bg-success/15 text-success",
  },
  awaiting_payment: {
    icon: Coins,
    label: "Awaiting Payment",
    className: "bg-warning/15 text-warning",
  },
  payment_overdue: {
    icon: AlertTriangle,
    label: "Payment Overdue",
    className: "bg-destructive/15 text-destructive",
  },
  request_pending: {
    icon: Clock,
    label: "Pending",
    className: "bg-muted text-muted-foreground",
  },
  rejected: {
    icon: X,
    label: "Rejected",
    className: "bg-muted text-muted-foreground",
  },
};

export function ParticipantStatusBadge({ status, size = "sm", className }: ParticipantStatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium",
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
        config.className,
        className
      )}
    >
      <Icon className={cn(size === "sm" ? "w-2.5 h-2.5" : "w-3 h-3")} />
      {config.label}
    </span>
  );
}

export function getParticipantStatus(
  requestStatus: "pending" | "accepted" | "rejected",
  paymentStatus: string,
  paymentDueAt?: string | null
): ParticipantStatus {
  if (requestStatus === "rejected") return "rejected";
  if (requestStatus === "pending") return "request_pending";
  
  // Accepted status
  if (paymentStatus === "verified") return "confirmed_paid";
  
  // Check if payment is overdue
  if (paymentDueAt && new Date(paymentDueAt) < new Date()) {
    return "payment_overdue";
  }
  
  return "awaiting_payment";
}
