import { cn } from "@/lib/utils";
import { Clock, Check, AlertCircle, CreditCard, XCircle, Loader2 } from "lucide-react";

type JoinStatus = 
  | "requested"           // Request sent, waiting for host
  | "confirmed_no_payment" // Confirmed, no payment needed yet  
  | "payment_needed"       // Payment deadline approaching
  | "payment_submitted"    // Payment uploaded, waiting verification
  | "confirmed_paid"       // Fully confirmed and paid
  | "rejected";            // Request rejected

interface JoinStatusBadgeProps {
  status: JoinStatus;
  paymentDeadline?: Date;
  className?: string;
}

const statusConfig: Record<JoinStatus, {
  icon: typeof Clock;
  label: string;
  message: string;
  className: string;
}> = {
  requested: {
    icon: Clock,
    label: "Pending",
    message: "Request sent – waiting for host",
    className: "bg-warning/10 text-warning border-warning/20",
  },
  confirmed_no_payment: {
    icon: Check,
    label: "Confirmed",
    message: "You're in! Payment will be requested closer to game time",
    className: "bg-success/10 text-success border-success/20",
  },
  payment_needed: {
    icon: CreditCard,
    label: "Payment Due",
    message: "Please complete payment to keep your spot",
    className: "bg-warning/10 text-warning border-warning/20",
  },
  payment_submitted: {
    icon: Loader2,
    label: "Verifying",
    message: "Payment submitted – waiting for host verification",
    className: "bg-primary/10 text-primary border-primary/20",
  },
  confirmed_paid: {
    icon: Check,
    label: "Confirmed",
    message: "Confirmed – you're all set!",
    className: "bg-success/10 text-success border-success/20",
  },
  rejected: {
    icon: XCircle,
    label: "Rejected",
    message: "There was an issue – contact the host",
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
};

export function JoinStatusBadge({ status, paymentDeadline, className }: JoinStatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "flex items-center gap-2.5 p-3 rounded-xl border",
        config.className,
        className
      )}
    >
      <Icon className={cn("w-5 h-5 shrink-0", status === "payment_submitted" && "animate-spin")} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{config.label}</p>
        <p className="text-xs opacity-80 truncate">
          {status === "payment_needed" && paymentDeadline
            ? `Pay by ${paymentDeadline.toLocaleDateString()} to keep your spot`
            : config.message}
        </p>
      </div>
    </div>
  );
}

export function getJoinStatus(
  requestStatus: "pending" | "accepted" | "rejected",
  paymentStatus: string,
  paymentMode: string
): JoinStatus {
  if (requestStatus === "rejected") return "rejected";
  
  if (requestStatus === "pending") {
    if (paymentStatus === "submitted") return "payment_submitted";
    return "requested";
  }
  
  // Accepted
  if (paymentMode === "confirm_first") {
    if (paymentStatus === "pending") return "payment_needed";
    if (paymentStatus === "submitted") return "payment_submitted";
    if (paymentStatus === "verified") return "confirmed_paid";
    return "confirmed_no_payment";
  }
  
  // pay_to_join mode
  if (paymentStatus === "verified") return "confirmed_paid";
  return "confirmed_paid"; // Already accepted means payment verified
}
