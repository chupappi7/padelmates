import { Navbar } from "@/components/layout/Navbar";
import { Trophy, TrendingUp, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";

export default function EloPage() {
  return (
    <div className="min-h-screen bg-background pb-24">
      <Navbar />

      <div className="flex flex-col items-center justify-center px-6 pt-20 text-center max-w-md mx-auto">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6"
        >
          <Trophy className="w-12 h-12 text-primary" />
        </motion.div>

        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="text-2xl font-bold text-foreground mb-2"
        >
          PDR — Coming Soon
        </motion.h1>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          className="text-muted-foreground text-sm leading-relaxed mb-10"
        >
          Padel Dynamic Rating — a Glicko-2 powered rating system built for padel. Track your level, forecast match outcomes, and climb the leaderboard.
        </motion.p>

        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="w-full space-y-3"
        >
          {[
            { icon: BarChart3, title: "Earned Ratings", desc: "No starting number — your PDR is calculated from real match results." },
            { icon: TrendingUp, title: "Score Matters", desc: "Winning 6-0 moves you more than winning 7-6. Margin counts." },
            { icon: Trophy, title: "Tier Progression", desc: "Climb from Beginner (2.0) to Pro (8.0) across 9 tiers." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-start gap-3 text-left rounded-xl border bg-card p-4">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <Icon className="w-4.5 h-4.5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
