import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, ArrowLeft, User, Trophy } from "lucide-react";
import { PasswordRequirements, isPasswordValid } from "@/components/auth/PasswordRequirements";
import { CZECH_REGIONS } from "@/lib/regions";
import { cn } from "@/lib/utils";

type Step = "account" | "about" | "skill";
const STEPS: Step[] = ["account", "about", "skill"];

const SKILL_CARDS = [
  { value: "4", label: "A", desc: "Advanced" },
  { value: "3", label: "B", desc: "Intermediate" },
  { value: "2", label: "C", desc: "Pre-intermediate" },
  { value: "1", label: "D", desc: "Beginner" },
];

function StepIndicator({ current }: { current: Step }) {
  const idx = STEPS.indexOf(current);
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {STEPS.map((s, i) => (
        <div
          key={s}
          className={cn(
            "h-2 rounded-full transition-all duration-300",
            i <= idx ? "bg-primary" : "bg-muted",
            i === idx ? "w-8" : "w-2"
          )}
        />
      ))}
    </div>
  );
}

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

  const [sex, setSex] = useState<string>("");
  const [age, setAge] = useState("");
  const [region, setRegion] = useState("");

  const [skillLevel, setSkillLevel] = useState("");
  const [loading, setLoading] = useState(false);

  const { signUp } = useAuth();
  const navigate = useNavigate();

  const goTo = (next: Step) => {
    setDir(STEPS.indexOf(next) > STEPS.indexOf(step) ? 1 : -1);
    setStep(next);
  };

  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      if (age) {
        updates.birth_year = new Date().getFullYear() - parseInt(age);
      }
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

  return (
    <div className="min-h-screen flex items-start justify-center p-4 overflow-y-auto py-8">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative"
      >
        {step === "account" ? (
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>
        ) : (
          <button
            onClick={() => goTo(step === "skill" ? "about" : "account")}
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        )}

        <div className="bg-card border border-border rounded-2xl p-8 shadow-lg">
          <StepIndicator current={step} />

          <AnimatePresence mode="wait" custom={dir}>
            {step === "account" && (
              <motion.div
                key="account"
                custom={dir}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25 }}
              >
                <div className="text-center mb-8">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">🎾</span>
                  </div>
                  <h1 className="font-display text-2xl font-bold">Create your account</h1>
                  <p className="text-muted-foreground mt-1">Start playing padel today</p>
                </div>

                <form onSubmit={handleAccountSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" type="text" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} required className="h-12" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-12" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} className="h-12 pr-12" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <PasswordRequirements password={password} />
                  </div>
                  <Button type="submit" variant="hero" className="w-full" size="lg" disabled={loading || !isPasswordValid(password)}>
                    {loading ? "Creating account..." : "Continue"}
                  </Button>
                </form>

                <p className="text-center text-sm text-muted-foreground mt-6">
                  Already have an account?{" "}
                  <Link to="/login" className="text-primary font-semibold hover:underline">Sign in</Link>
                </p>
              </motion.div>
            )}

            {step === "about" && (
              <motion.div
                key="about"
                custom={dir}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25 }}
              >
                <div className="text-center mb-8">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center mx-auto mb-4">
                    <User className="w-7 h-7 text-primary-foreground" />
                  </div>
                  <h1 className="font-display text-2xl font-bold">About you</h1>
                  <p className="text-muted-foreground mt-1">Tell us a bit more about yourself</p>
                </div>

                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label>Sex</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["male", "female", "other"] as const).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setSex(s)}
                          className={cn(
                            "h-11 rounded-lg border text-sm font-medium transition-all capitalize",
                            sex === s
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-background text-muted-foreground hover:border-primary/50"
                          )}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="age">Age <span className="text-muted-foreground font-normal">(optional)</span></Label>
                    <Input
                      id="age"
                      type="number"
                      placeholder="e.g. 28"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      min={10}
                      max={99}
                      className="h-12"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Region</Label>
                    <Select value={region} onValueChange={setRegion}>
                      <SelectTrigger className="h-12"><SelectValue placeholder="Select your region" /></SelectTrigger>
                      <SelectContent>
                        {CZECH_REGIONS.map((r) => (
                          <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    variant="hero"
                    className="w-full"
                    size="lg"
                    onClick={handleAboutSubmit}
                    disabled={!sex || !region || loading}
                  >
                    {loading ? "Saving..." : "Continue"}
                  </Button>
                </div>
              </motion.div>
            )}

            {step === "skill" && (
              <motion.div
                key="skill"
                custom={dir}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25 }}
              >
                <div className="text-center mb-8">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center mx-auto mb-4">
                    <Trophy className="w-7 h-7 text-primary-foreground" />
                  </div>
                  <h1 className="font-display text-2xl font-bold">Your padel level</h1>
                  <p className="text-muted-foreground mt-1">How would you rate yourself?</p>
                </div>

                <div className="space-y-3 mb-6">
                  {SKILL_CARDS.map((card) => (
                    <button
                      key={card.value}
                      type="button"
                      onClick={() => setSkillLevel(card.value)}
                      className={cn(
                        "w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left",
                        skillLevel === card.value
                          ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                          : "border-border bg-background hover:border-primary/50"
                      )}
                    >
                      <span className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold shrink-0",
                        skillLevel === card.value
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      )}>
                        {card.label}
                      </span>
                      <span className="text-sm text-foreground">{card.desc}</span>
                    </button>
                  ))}
                </div>

                <Button
                  variant="hero"
                  className="w-full"
                  size="lg"
                  onClick={handleSkillSubmit}
                  disabled={!skillLevel || loading}
                >
                  {loading ? "Creating..." : "Create Account"}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
