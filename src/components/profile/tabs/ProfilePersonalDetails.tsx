import { useState, useEffect } from "react";
import { MapPin, Target, Hand, Users, Cake, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CZECH_REGIONS, getRegionLabel } from "@/lib/regions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Props {
  userId: string;
  region: string | null;
  preferredPosition: string | null;
  preferredHand: string | null;
  sex: string | null;
  birthYear: number | null;
  onSaved: () => void;
}

interface EditState {
  region: string | null;
  preferred_position: string | null;
  preferred_hand: string | null;
  sex: string | null;
  birth_year: number | null;
}

export function ProfilePersonalDetails({ userId, region, preferredPosition, preferredHand, sex, birthYear, onSaved }: Props) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>({ region, preferred_position: preferredPosition, preferred_hand: preferredHand, sex, birth_year: birthYear });
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setEditState({ region, preferred_position: preferredPosition, preferred_hand: preferredHand, sex, birth_year: birthYear });
    setHasChanges(false);
  }, [region, preferredPosition, preferredHand, sex, birthYear]);

  const updateField = (field: keyof EditState, value: any) => {
    setEditState(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
    setEditing(null);
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      region: editState.region, preferred_position: editState.preferred_position,
      preferred_hand: editState.preferred_hand, sex: editState.sex, birth_year: editState.birth_year,
    } as any).eq("user_id", userId);
    if (error) toast.error("Failed to save");
    else { toast.success("Saved!"); setHasChanges(false); onSaved(); }
    setSaving(false);
  };

  const age = editState.birth_year ? new Date().getFullYear() - editState.birth_year : null;
  const genderLabel = (val: string | null) => { if (!val) return null; if (val === "male") return "Male"; if (val === "female") return "Female"; return "Other"; };

  const fields = [
    { key: "region", icon: MapPin, label: "Location", value: editState.region ? getRegionLabel(editState.region) : null, full: true,
      edit: <Select value={editState.region || ""} onValueChange={v => updateField("region", v)}><SelectTrigger className="h-9 text-xs bg-white/10 border-white/20 text-white"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{CZECH_REGIONS.map(r => <SelectItem key={r.value} value={r.value} className="text-xs">{r.label}</SelectItem>)}</SelectContent></Select> },
    { key: "birth_year", icon: Cake, label: "Age", value: age ? String(age) : null,
      edit: <Input type="number" min={10} max={99} placeholder="e.g. 25" className="h-9 text-xs bg-white/10 border-white/20 text-white" defaultValue={age || ""} onBlur={e => { const v = parseInt(e.target.value); updateField("birth_year", v ? new Date().getFullYear() - v : null); }} /> },
    { key: "sex", icon: Users, label: "Gender", value: genderLabel(editState.sex),
      edit: <Select value={editState.sex || ""} onValueChange={v => updateField("sex", v)}><SelectTrigger className="h-9 text-xs bg-white/10 border-white/20 text-white"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="male" className="text-xs">Male</SelectItem><SelectItem value="female" className="text-xs">Female</SelectItem><SelectItem value="other" className="text-xs">Other</SelectItem></SelectContent></Select> },
    { key: "preferred_position", icon: Target, label: "Position", value: editState.preferred_position ? `${editState.preferred_position === "left" ? "Left" : "Right"} Side` : null,
      edit: <div className="flex gap-1">{["left", "right"].map(s => <button key={s} onClick={() => updateField("preferred_position", s)} className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${editState.preferred_position === s ? "bg-[#14b8a6] text-white" : "bg-white/10 text-white/60"}`}>{s === "left" ? "Left" : "Right"}</button>)}</div> },
    { key: "preferred_hand", icon: Hand, label: "Hand", value: editState.preferred_hand ? (editState.preferred_hand === "left" ? "Left" : "Right") : null,
      edit: <div className="flex gap-1">{["left", "right"].map(h => <button key={h} onClick={() => updateField("preferred_hand", h)} className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${editState.preferred_hand === h ? "bg-[#14b8a6] text-white" : "bg-white/10 text-white/60"}`}>{h === "left" ? "Left" : "Right"}</button>)}</div> },
  ];

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl overflow-hidden">
        <CollapsibleTrigger className="w-full flex items-center justify-between px-4 py-3.5">
          <span className="text-[11px] font-semibold text-white/50 uppercase tracking-[0.1em]">Personal Details</span>
          {open ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              {fields.map(f => {
                const Icon = f.icon;
                const isEditing = editing === f.key;
                return (
                  <div
                    key={f.key}
                    className={`rounded-xl border border-white/10 p-3 cursor-pointer transition-all ${(f as any).full ? "col-span-2" : ""} ${isEditing ? "border-[#14b8a6]/30 bg-[#14b8a6]/5" : "hover:border-white/20"}`}
                    onClick={() => { if (!isEditing) setEditing(f.key); }}
                  >
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Icon className="w-3.5 h-3.5 text-white/40" />
                      <span className="text-[10px] font-medium text-white/40 uppercase tracking-wider">{f.label}</span>
                    </div>
                    {isEditing ? <div onClick={e => e.stopPropagation()}>{f.edit}</div> : (
                      <p className={`text-sm font-medium truncate ${f.value ? "text-white" : "text-white/25"}`}>{f.value || "Tap to set"}</p>
                    )}
                  </div>
                );
              })}
            </div>
            {hasChanges && (
              <Button onClick={handleSave} disabled={saving} className="w-full bg-[#14b8a6] hover:bg-[#14b8a6]/80 text-white">
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
