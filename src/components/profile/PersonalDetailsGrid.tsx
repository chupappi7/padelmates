import { useState, useEffect } from "react";
import { MapPin, Target, Hand, Users, Cake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CZECH_REGIONS, getRegionLabel } from "@/lib/regions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PersonalDetailsGridProps {
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

export function PersonalDetailsGrid({
  userId,
  region,
  preferredPosition,
  preferredHand,
  sex,
  birthYear,
  onSaved,
}: PersonalDetailsGridProps) {
  const [editing, setEditing] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>({
    region,
    preferred_position: preferredPosition,
    preferred_hand: preferredHand,
    sex,
    birth_year: birthYear,
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setEditState({
      region,
      preferred_position: preferredPosition,
      preferred_hand: preferredHand,
      sex,
      birth_year: birthYear,
    });
    setHasChanges(false);
  }, [region, preferredPosition, preferredHand, sex, birthYear]);

  const updateField = (field: keyof EditState, value: any) => {
    setEditState((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
    setEditing(null);
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        region: editState.region,
        preferred_position: editState.preferred_position,
        preferred_hand: editState.preferred_hand,
        sex: editState.sex,
        birth_year: editState.birth_year,
      } as any)
      .eq("user_id", userId);

    if (error) {
      toast.error("Failed to save changes");
    } else {
      toast.success("Profile updated!");
      setHasChanges(false);
      onSaved();
    }
    setSaving(false);
  };

  const age = editState.birth_year
    ? new Date().getFullYear() - editState.birth_year
    : null;

  const genderLabel = (val: string | null) => {
    if (!val) return null;
    if (val === "male") return "Male";
    if (val === "female") return "Female";
    return "Prefer not to say";
  };

  const cards = [
    {
      key: "region",
      icon: MapPin,
      label: "Location",
      value: editState.region ? getRegionLabel(editState.region) : null,
      editContent: (
        <Select
          value={editState.region || ""}
          onValueChange={(v) => updateField("region", v)}
        >
          <SelectTrigger className="h-9 text-xs">
            <SelectValue placeholder="Select region" />
          </SelectTrigger>
          <SelectContent>
            {CZECH_REGIONS.map((r) => (
              <SelectItem key={r.value} value={r.value} className="text-xs">
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
    },
    {
      key: "birth_year",
      icon: Cake,
      label: "Age",
      value: age ? String(age) : null,
      editContent: (
        <Input
          type="number"
          min={10}
          max={99}
          placeholder="e.g. 25"
          className="h-9 text-xs"
          defaultValue={age || ""}
          onBlur={(e) => {
            const val = parseInt(e.target.value);
            updateField(
              "birth_year",
              val ? new Date().getFullYear() - val : null
            );
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const val = parseInt((e.target as HTMLInputElement).value);
              updateField(
                "birth_year",
                val ? new Date().getFullYear() - val : null
              );
            }
          }}
        />
      ),
    },
    {
      key: "sex",
      icon: Users,
      label: "Gender",
      value: genderLabel(editState.sex),
      editContent: (
        <Select
          value={editState.sex || ""}
          onValueChange={(v) => updateField("sex", v)}
        >
          <SelectTrigger className="h-9 text-xs">
            <SelectValue placeholder="Select gender" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="male" className="text-xs">Male</SelectItem>
            <SelectItem value="female" className="text-xs">Female</SelectItem>
            <SelectItem value="other" className="text-xs">Prefer not to say</SelectItem>
          </SelectContent>
        </Select>
      ),
    },
    {
      key: "preferred_position",
      icon: Target,
      label: "Position",
      value: editState.preferred_position
        ? `${editState.preferred_position === "left" ? "Left" : "Right"} Side`
        : null,
      editContent: (
        <div className="flex gap-1">
          {["left", "right"].map((side) => (
            <button
              key={side}
              onClick={() => updateField("preferred_position", side)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                editState.preferred_position === side
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {side === "left" ? "Left Side" : "Right Side"}
            </button>
          ))}
        </div>
      ),
    },
    {
      key: "preferred_hand",
      icon: Hand,
      label: "Preferred Hand",
      value: editState.preferred_hand
        ? editState.preferred_hand === "left"
          ? "Left"
          : "Right"
        : null,
      editContent: (
        <div className="flex gap-1">
          {["left", "right"].map((hand) => (
            <button
              key={hand}
              onClick={() => updateField("preferred_hand", hand)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                editState.preferred_hand === hand
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {hand === "left" ? "Left" : "Right"}
            </button>
          ))}
        </div>
      ),
    },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
      <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.1em]">
        Personal Details
      </h3>

      <div className="grid grid-cols-2 gap-2.5">
        {cards.map((card) => {
          const Icon = card.icon;
          const isEditing = editing === card.key;

          return (
            <div
              key={card.key}
              className={`rounded-xl border p-3 transition-all cursor-pointer ${
                card.key === "region" ? "col-span-2" : ""
              } ${
                isEditing
                  ? "border-primary/30 bg-primary/5"
                  : "border-border hover:border-primary/20 hover:bg-muted/30"
              }`}
              onClick={() => {
                if (!isEditing) setEditing(card.key);
              }}
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  {card.label}
                </span>
              </div>

              {isEditing ? (
                <div onClick={(e) => e.stopPropagation()}>
                  {card.editContent}
                </div>
              ) : (
                <p className={`text-sm font-medium truncate ${card.value ? "text-foreground" : "text-muted-foreground/50"}`}>
                  {card.value || "Tap to set"}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {hasChanges && (
        <Button
          variant="hero"
          className="w-full"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      )}
    </div>
  );
}
