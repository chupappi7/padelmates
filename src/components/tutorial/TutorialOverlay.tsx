import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, Users, Signal, Share2, Star } from "lucide-react";

interface TutorialStep {
  selector: string | null;
  title: string;
  description: string;
  isLarger?: boolean;
  isGreyed?: boolean;
  comingSoon?: boolean;
  useMockCard?: boolean;
}

const STEPS: TutorialStep[] = [
  {
    selector: '[data-tutorial="mock-card"]',
    title: "Find a match",
    description: "Browse open matches near you. Filter by level, format or club.",
    useMockCard: true,
  },
  {
    selector: '[data-tutorial="mock-card"]',
    title: "See who is playing",
    description: "Tap any match to see details, the level, location and who has already joined.",
    useMockCard: true,
  },
  {
    selector: '[data-tutorial="host-button"]',
    title: "Host a match",
    description: "Create your own match in seconds. Choose format, level, location and time.",
  },
  {
    selector: null,
    title: "Share to WhatsApp",
    description: "One tap generates a ready message for your WhatsApp group. No typing needed.",
    isLarger: true,
  },
  {
    selector: null,
    title: "Give credits",
    description: "After a match ends you have 72 hours to reward a player who impressed you.",
  },
  {
    selector: null,
    title: "PDR Rating — Coming Soon",
    description: "Your Padel Dynamic Rating is on its way. Every match you play will count towards your rating. Stay tuned.",
    isGreyed: true,
    comingSoon: true,
  },
];

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

/* ── Mock example game card ── */
function MockGameCard() {
  return (
    <div
      data-tutorial="mock-card"
      className="bg-card rounded-2xl border border-border shadow-sm p-4 w-[calc(100vw-48px)] max-w-[360px]"
      style={{ pointerEvents: "none" }}
    >
      {/* Top row */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <p className="font-display font-bold text-sm text-foreground truncate">Sunday Padel Session</p>
          <div className="flex items-center gap-1.5 mt-1">
            <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground truncate">Padel Club Bangkok</span>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-primary/10 px-2 py-1 rounded-full shrink-0 ml-2">
          <Signal className="w-3 h-3 text-primary" />
          <span className="text-[10px] font-semibold text-primary">B</span>
        </div>
      </div>

      {/* Info chips */}
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <div className="flex items-center gap-1 bg-muted px-2 py-1 rounded-full">
          <Clock className="w-3 h-3 text-muted-foreground" />
          <span className="text-[10px] font-medium text-muted-foreground">Today 18:00</span>
        </div>
        <div className="flex items-center gap-1 bg-muted px-2 py-1 rounded-full">
          <Users className="w-3 h-3 text-muted-foreground" />
          <span className="text-[10px] font-medium text-muted-foreground">3 / 8</span>
        </div>
      </div>

      {/* Host + avatars row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-[10px] font-bold text-primary">A</span>
          </div>
          <span className="text-xs text-muted-foreground">Alex</span>
        </div>
        <div className="flex -space-x-1.5">
          {["bg-secondary/30", "bg-accent/30", "bg-primary/30"].map((bg, i) => (
            <div key={i} className={`w-5 h-5 rounded-full ${bg} border-2 border-card`} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function TutorialOverlay({ onComplete }: { onComplete: () => void }) {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const observerRef = useRef<ResizeObserver | null>(null);
  const mockRef = useRef<HTMLDivElement>(null);

  const current = STEPS[step];
  const showMock = !!current.useMockCard;

  const measureTarget = useCallback(() => {
    const sel = current.selector;
    if (!sel) { setTargetRect(null); return; }

    // Small delay for mock card to render
    requestAnimationFrame(() => {
      const el = document.querySelector(sel);
      if (el) {
        const r = el.getBoundingClientRect();
        setTargetRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      } else {
        setTargetRect(null);
      }
    });
  }, [current.selector]);

  useEffect(() => {
    // Delay measurement slightly so mock card is in DOM
    const timer = setTimeout(measureTarget, 50);
    window.addEventListener("resize", measureTarget);
    window.addEventListener("scroll", measureTarget, true);

    if (current.selector) {
      const el = document.querySelector(current.selector);
      if (el) {
        observerRef.current = new ResizeObserver(measureTarget);
        observerRef.current.observe(el);
      }
    }

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", measureTarget);
      window.removeEventListener("scroll", measureTarget, true);
      observerRef.current?.disconnect();
    };
  }, [step, measureTarget]);

  const finish = async () => {
    if (user) {
      await supabase
        .from("profiles")
        .update({ tutorial_completed: true } as any)
        .eq("user_id", user.id);
    }
    onComplete();
  };

  const handleContinue = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
    else finish();
  };

  const PAD = 8;
  const hasTarget = !!targetRect;
  const isCentered = !hasTarget && !showMock;

  const getTooltipStyle = (): React.CSSProperties => {
    if (isCentered || !targetRect) {
      return {
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      };
    }

    const showBelow = targetRect.top + targetRect.height + PAD + 240 < window.innerHeight;

    return {
      position: "fixed",
      top: showBelow ? targetRect.top + targetRect.height + PAD + 12 : undefined,
      bottom: !showBelow ? window.innerHeight - targetRect.top + PAD + 12 : undefined,
      left: Math.max(16, Math.min(targetRect.left, window.innerWidth - 320)),
      maxWidth: Math.min(300, window.innerWidth - 32),
    };
  };

  return (
    <div className="fixed inset-0 z-[9999]" style={{ pointerEvents: "auto" }}>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/75 transition-opacity" />

      {/* Mock card rendered on-screen for steps that need it */}
      {showMock && (
        <div
          ref={mockRef}
          className="fixed z-[10002] flex items-center justify-center"
          style={{
            top: "28%",
            left: "50%",
            transform: "translateX(-50%)",
          }}
        >
          <MockGameCard />
        </div>
      )}

      {/* Highlight cutout */}
      <AnimatePresence mode="wait">
        {hasTarget && targetRect && (
          <motion.div
            key={`highlight-${step}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed rounded-2xl"
            style={{
              top: targetRect.top - PAD,
              left: targetRect.left - PAD,
              width: targetRect.width + PAD * 2,
              height: targetRect.height + PAD * 2,
              boxShadow: current.isGreyed
                ? "0 0 0 9999px rgba(0,0,0,0.75), 0 0 0 4px hsl(215 16% 47%), 0 0 20px 4px hsl(215 16% 47% / 0.4)"
                : "0 0 0 9999px rgba(0,0,0,0.75), 0 0 0 4px hsl(175 84% 32%), 0 0 20px 4px hsl(175 84% 32% / 0.4)",
              zIndex: 10000,
              pointerEvents: "none",
            }}
          />
        )}
      </AnimatePresence>

      {/* Tooltip */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`tooltip-${step}`}
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.25 }}
          style={{
            ...getTooltipStyle(),
            zIndex: 10003,
          }}
          className={`bg-[#1A1F2E] border border-[#2A3040] rounded-2xl shadow-2xl ${current.isLarger ? "p-6 max-w-[340px]" : "p-5 max-w-[300px]"}`}
        >
          {/* Step indicator */}
          <p className="text-xs text-[#94A3B8] font-medium mb-2">
            {step + 1} of {STEPS.length}
          </p>

          {/* Title */}
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-base font-bold text-white font-display">
              {current.title}
            </h3>
            {current.comingSoon && (
              <Badge className="bg-[#64748B]/20 text-[#94A3B8] border-[#64748B]/30 text-[10px] px-2 py-0.5">
                Coming Soon
              </Badge>
            )}
          </div>

          {/* Description */}
          <p className="text-sm text-[#94A3B8] leading-relaxed mb-4">
            {current.description}
          </p>

          {/* Continue button */}
          <button
            onClick={handleContinue}
            className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors ${
              current.isGreyed
                ? "bg-[#64748B] text-white hover:bg-[#64748B]/80"
                : "bg-[hsl(175,84%,32%)] text-white hover:bg-[hsl(175,84%,28%)]"
            }`}
          >
            {step === STEPS.length - 1 ? "Let's play" : "Continue"}
          </button>

          {/* Skip */}
          <button
            onClick={finish}
            className="w-full mt-2 text-xs text-[#64748B] hover:text-[#94A3B8] transition-colors py-1"
          >
            Skip tour
          </button>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
