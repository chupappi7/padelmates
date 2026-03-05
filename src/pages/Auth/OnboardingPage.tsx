import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { User, Trophy } from "lucide-react";
import logoIcon from "@/assets/logo-icon-dark.png";
import { CZECH_REGIONS } from "@/lib/regions";
import { cn } from "@/lib/utils";

type Step = "about" | "skill";

const SKILL_CARDS = [
  { value: "4", label: "A", desc: "Advanced" },
  { value: "3", label: "B", desc: "Intermediate" },
  { value: "2", label: "C", desc: "Pre-intermediate" },
  { value: "1", label: "D", desc: "Beginner" },
];

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
};

export default function OnboardingPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("about");
  const [dir, setDir] = useState(1);
  const [sex, setSex] = useState("");
  const [age, setAge] = useState("");
  const [region, setRegion] = useState("");
  const [skillLevel, setSkillLevel] = useState("");
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login", { replace: true });
      return;
    }
    if (user) {
      const googleName = user.user_metadata?.name || user.user_metadata?.full_name || "";
      setUserName(googleName);
    }
  }, [user, authLoading, navigate]);

  const goTo = (next: Step) => {
    setDir(next === "skill" ? 1 : -1);
    setStep(next);
  };

  const handleAboutSubmit = async () => {
    if (!sex || !region) return;
    setLoading(true);
    const updates: Record<string, unknown> = { sex, region };
    if (age) updates.birth_year = new Date().getFullYear() - parseInt(age);
    await supabase.from("profiles").update(updates as any).eq("user_id", user!.id);
    setLoading(false);
    goTo("skill");
  };

  const handleSkillSubmit = async () => {
    if (!skillLevel) return;
    setLoading(true);
    await supabase
      .from("profiles")
      .update({ skill_level: parseInt(skillLevel) } as any)
      .eq("user_id", user!.id);
    setLoading(false);
    toast.success("Welcome to PadelMates!");
    sessionStorage.removeItem("oauth_onboarding_checked");
    navigate("/games", { replace: true });
  };

  const inputClass = (field?: string) =>
    `w-full h-[52px] rounded-xl px-4 text-base bg-white border outline-none transition-colors ${field ? "border-red-500" : "border-[#E2E8F0] focus:border-primary"}`;

  if (authLoading) return null;

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6 pb-24 relative overflow-hidden"
      style={{
        backgroundColor: "#0D1F1E",
        backgroundImage:
          "radial-gradient(ellipse at 20% 50%, rgba(20,184,166,0.12) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(20,184,166,0.08) 0%, transparent 50%)",
      }}
    >
      <div className="absolute top-[-10%] right-[-5%] w-72 h-72 md:w-96 md:h-96 rounded-full bg-primary/10 blur-3xl animate-float pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-80 h-80 md:w-96 md:h-96 rounded-full bg-primary/[0.07] blur-3xl animate-float pointer-events-none" style={{ animationDelay: "3s" }} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo */}
        <div className="flex items-center gap-3 justify-center mb-6">
          <img src={logoIcon} alt="PadelMates" className="w-10 h-10 rounded-lg" />
          <span className="text-2xl font-bold text-white">
            Padel<span className="text-primary">Mates</span>
          </span>
        </div>

        {userName && (
          <p className="text-center text-[#94A3B8] text-sm mb-4">
            Welcome, <span className="text-white font-medium">{userName}</span>! Let's finish setting up your profile.
          </p>
        )}

        <AnimatePresence mode="wait" custom={dir}>
          {/* ── STEP 1: About ── */}
          {step === "about" && (
            <motion.div key="about" custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }}>
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                  <User className="w-6 h-6 text-primary" />
                </div>
              </div>
              <h1 className="text-3xl font-bold text-white text-center mb-1">About you</h1>
              <p className="text-center text-[#94A3B8] mb-8">Tell us a bit more about yourself</p>

              <div className="flex flex-col gap-4">
                <div>
                  <p className="text-sm text-[#94A3B8] mb-2">Sex</p>
                  <div className="grid grid-cols-3 gap-2">
                    {(["male", "female", "other"] as const).map((s) => (
                      <button key={s} type="button" onClick={() => setSex(s)}
                        className={cn("h-[52px] rounded-xl border text-sm font-medium capitalize transition-all",
                          sex === s ? "border-primary bg-primary/20 text-primary" : "border-[#E2E8F0] bg-white text-[#64748B] hover:border-primary/50"
                        )}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <input type="number" placeholder="Age (optional)" value={age} onChange={(e) => setAge(e.target.value)} min={10} max={99} className={inputClass()} />

                <select value={region} onChange={(e) => setRegion(e.target.value)}
                  className={`${inputClass()} ${!region ? "text-[#94A3B8]" : "text-foreground"} appearance-none`}>
                  <option value="" disabled>Select your region</option>
                  {CZECH_REGIONS.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>

                <button type="button" onClick={handleAboutSubmit} disabled={!sex || !region || loading}
                  className="w-full h-[52px] rounded-xl bg-primary text-white font-bold text-base transition-opacity disabled:opacity-50 mt-2">
                  {loading ? "Saving..." : "Continue"}
                </button>
              </div>
            </motion.div>
          )}

          {/* ── STEP 2: Skill ── */}
          {step === "skill" && (
            <motion.div key="skill" custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }}>
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-primary" />
                </div>
              </div>
              <h1 className="text-3xl font-bold text-white text-center mb-1">Your padel level</h1>
              <p className="text-center text-[#94A3B8] mb-8">How would you rate yourself?</p>

              <div className="flex flex-col gap-2 mb-6">
                {SKILL_CARDS.map((card) => (
                  <button key={card.value} type="button" onClick={() => setSkillLevel(card.value)}
                    className={cn("w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left",
                      skillLevel === card.value
                        ? "border-primary bg-primary/20"
                        : "border-[#E2E8F0] bg-white hover:border-primary/50"
                    )}>
                    <span className={cn("w-9 h-9 rounded-lg flex items-center justify-center text-base font-bold shrink-0",
                      skillLevel === card.value ? "bg-primary text-white" : "bg-[#F1F5F9] text-[#64748B]"
                    )}>
                      {card.label}
                    </span>
                    <span className={cn("text-sm", skillLevel === card.value ? "text-white font-medium" : "text-[#334155]")}>
                      {card.desc}
                    </span>
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => goTo("about")} className="flex-1 h-[52px] rounded-xl border border-[#E2E8F0] text-white font-bold text-base hover:bg-white/5 transition-colors">
                  Back
                </button>
                <button type="button" onClick={handleSkillSubmit} disabled={!skillLevel || loading} className="flex-[2] h-[52px] rounded-xl bg-primary text-white font-bold text-base transition-opacity disabled:opacity-50">
                  {loading ? "Finishing..." : "Let's Go!"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
