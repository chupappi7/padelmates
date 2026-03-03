import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, User, Trophy } from "lucide-react";
import logoIcon from "@/assets/logo-icon-dark.png";
import { PasswordRequirements, isPasswordValid } from "@/components/auth/PasswordRequirements";
import { CZECH_REGIONS } from "@/lib/regions";
import { cn } from "@/lib/utils";

type Step = "account" | "about" | "skill";

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

export default function SignupPage() {
  const [step, setStep] = useState<Step>("account");
  const [dir, setDir] = useState(1);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string }>({});

  const [sex, setSex] = useState("");
  const [age, setAge] = useState("");
  const [region, setRegion] = useState("");

  const [skillLevel, setSkillLevel] = useState("");
  const [loading, setLoading] = useState(false);

  const { signUp } = useAuth();
  const navigate = useNavigate();

  const goTo = (next: Step) => {
    const steps: Step[] = ["account", "about", "skill"];
    setDir(steps.indexOf(next) > steps.indexOf(step) ? 1 : -1);
    setStep(next);
  };

  const validate = () => {
    const next: typeof errors = {};
    if (!name.trim()) next.name = "Name is required";
    if (!email) next.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(email)) next.email = "Enter a valid email";
    if (!password) next.password = "Password is required";
    else if (!isPasswordValid(password)) next.password = "Password doesn't meet requirements";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    const { error } = await signUp(email, password, name);
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    setLoading(false);
    goTo("about");
  };

  const handleAboutSubmit = async () => {
    if (!sex || !region) return;
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const updates: Record<string, unknown> = { sex, region };
      if (age) updates.birth_year = new Date().getFullYear() - parseInt(age);
      await supabase.from("profiles").update(updates as any).eq("user_id", user.id);
    }
    setLoading(false);
    goTo("skill");
  };

  const handleSkillSubmit = async () => {
    if (!skillLevel) return;
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("profiles")
        .update({ skill_level: parseInt(skillLevel) } as any)
        .eq("user_id", user.id);
    }
    setLoading(false);
    toast.success("Account created successfully!");
    navigate("/games");
  };

  const inputClass = (field?: string) =>
    `w-full h-[52px] rounded-xl px-4 text-base bg-white border outline-none transition-colors ${field ? "border-red-500" : "border-[#E2E8F0] focus:border-primary"}`;

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6 pb-24 relative overflow-hidden"
      style={{
        backgroundColor: "#0D1F1E",
        backgroundImage:
          "radial-gradient(ellipse at 20% 50%, rgba(20,184,166,0.12) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(20,184,166,0.08) 0%, transparent 50%)",
      }}
    >
      {/* Glow orbs */}
      <div className="absolute top-[-10%] right-[-5%] w-72 h-72 md:w-96 md:h-96 rounded-full bg-primary/10 blur-3xl animate-float pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-80 h-80 md:w-96 md:h-96 rounded-full bg-primary/[0.07] blur-3xl animate-float pointer-events-none" style={{ animationDelay: "3s" }} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo — always visible, always same size */}
        <div className="flex flex-col items-center mb-10">
          <img src={logoIcon} alt="PadelMates" className="w-14 h-14 mb-3 rounded-full" />
          <span className="text-2xl font-bold text-white">
            Padel<span className="text-primary">Mates</span>
          </span>
        </div>

        <AnimatePresence mode="wait" custom={dir}>
          {/* ── STEP 1: Account ── */}
          {step === "account" && (
            <motion.div key="account" custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }}>
              <h1 className="text-3xl font-bold text-white text-center mb-1">Create your account</h1>
              <p className="text-center text-[#94A3B8] mb-8">
                Join <span className="text-white font-semibold">Padel</span><span className="text-primary font-semibold">Mates</span> today
              </p>

              <form onSubmit={handleAccountSubmit} noValidate className="flex flex-col gap-4">
                <div>
                  <input type="text" placeholder="Full Name" value={name} onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: undefined })); }} className={inputClass(errors.name)} />
                  {errors.name && <p className="text-red-500 text-xs mt-1 ml-1">{errors.name}</p>}
                </div>
                <div>
                  <input type="email" placeholder="Email" value={email} onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: undefined })); }} className={inputClass(errors.email)} />
                  {errors.email && <p className="text-red-500 text-xs mt-1 ml-1">{errors.email}</p>}
                </div>
                <div>
                  <div className="relative">
                    <input type={showPassword ? "text" : "password"} placeholder="Password" value={password} onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: undefined })); }} className={`${inputClass(errors.password)} pr-12`} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#64748B]">
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-red-500 text-xs mt-1 ml-1">{errors.password}</p>}
                  <PasswordRequirements password={password} />
                </div>

                <button type="submit" disabled={loading || !isPasswordValid(password)} className="w-full h-[52px] rounded-xl bg-primary text-white font-bold text-base transition-opacity disabled:opacity-50 mt-2">
                  {loading ? "Creating account..." : "Continue"}
                </button>
              </form>

              <p className="text-center text-sm text-[#94A3B8] mt-8">
                Already have an account?{" "}
                <Link to="/login" className="text-primary font-semibold hover:underline">Sign in</Link>
              </p>
            </motion.div>
          )}

          {/* ── STEP 2: About ── */}
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

                <div className="flex gap-3 mt-2">
                  <button type="button" onClick={() => goTo("account")} className="flex-1 h-[52px] rounded-xl border border-[#E2E8F0] text-white font-bold text-base hover:bg-white/5 transition-colors">
                    Back
                  </button>
                  <button type="button" onClick={handleAboutSubmit} disabled={!sex || !region || loading} className="flex-[2] h-[52px] rounded-xl bg-primary text-white font-bold text-base transition-opacity disabled:opacity-50">
                    {loading ? "Saving..." : "Continue"}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── STEP 3: Skill ── */}
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
                  {loading ? "Creating..." : "Create Account"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
