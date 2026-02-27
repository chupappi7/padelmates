import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CZECH_REGIONS } from "@/lib/regions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { MapPin, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const DISMISSED_KEY = "region_prompt_dismissed";

export function RegionPrompt() {
  const { user } = useAuth();
  const [show, setShow] = useState(false);
  const [region, setRegion] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    const dismissed = localStorage.getItem(DISMISSED_KEY);
    if (dismissed) return;

    // Check if user already has a region
    supabase
      .from("profiles")
      .select("region")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (!data?.region) setShow(true);
      });
  }, [user]);

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "true");
    setShow(false);
  };

  const save = async () => {
    if (!user || !region) return;
    setSaving(true);
    await supabase
      .from("profiles")
      .update({ region } as any)
      .eq("user_id", user.id);
    toast.success("Region saved!");
    dismiss();
    setSaving(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          className="fixed top-16 left-0 right-0 z-40 px-4"
        >
          <div className="max-w-lg mx-auto bg-card border border-border rounded-2xl p-4 shadow-lg">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-display font-bold text-sm">Where do you play?</p>
                  <button onClick={dismiss} className="text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  We'll show you players and clubs near you.
                </p>
                <div className="flex gap-2">
                  <Select value={region} onValueChange={setRegion}>
                    <SelectTrigger className="h-9 flex-1 text-xs">
                      <SelectValue placeholder="Select region" />
                    </SelectTrigger>
                    <SelectContent>
                      {CZECH_REGIONS.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="hero"
                    size="sm"
                    onClick={save}
                    disabled={!region || saving}
                    className="h-9 px-4"
                  >
                    Save
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
