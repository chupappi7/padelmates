import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";

interface TutorialStep {
  selector: string | null;
  title: string;
  description: string;
  isLarger?: boolean;
  isGreyed?: boolean;
  comingSoon?: boolean;
}

const STEPS: TutorialStep[] = [
  {
    selector: '[data-tutorial="matches-list"]',
    title: "Find a match",
    description: "Browse open matches near you. Filter by level, format or club.",
  },
  {
    selector: '[data-tutorial="game-card"]',
    title: "See who is playing",
    description: "Tap any match to see details, the level, location and who has already joined.",
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

export function TutorialOverlay({ onComplete }: { onComplete: () => void }) {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const observerRef = useRef<ResizeObserver | null>(null);

  const current = STEPS[step];

  const measureTarget = useCallback(() => {
    if (!current.selector) {
      setTargetRect(null);
      return;
    }
    const el = document.querySelector(current.selector);
    if (el) {
      const r = el.getBoundingClientRect();
      setTargetRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    } else {
      setTargetRect(null);
    }
  }, [current.selector]);

  useEffect(() => {
    measureTarget();
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
  const isCentered = !hasTarget;

  // Tooltip positioning
  const getTooltipStyle = (): React.CSSProperties => {
    if (isCentered) {
      return {
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      };
    }
    if (!targetRect) return {};

    const below = targetRect.top + targetRect.height + PAD + 20;
    const above = targetRect.top - PAD - 20;
    const showBelow = below + 220 < window.innerHeight;

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
            zIndex: 10001,
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
