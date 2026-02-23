import { useState } from "react";
import { MapPin, ChevronDown, Search, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface Court {
  name: string;
  address: string;
}

export interface CourtGroup {
  region: string;
  courts: Court[];
}

const COURTS: CourtGroup[] = [
  {
    region: "Prague / Central Bohemian Region",
    courts: [
      { name: "Padel Powers Smíchov", address: "Nádražní 32, Praha 5" },
      { name: "Tenis & Padel klub Písečná", address: "Písečná 1, Praha 8" },
      { name: "Czech Padel Academy", address: "Cukrovarská 30, Praha 9 – Čakovice" },
      { name: "\"For Padel\" Sport park Zdiměřice", address: "Pražská 288, Jesenice u Prahy" },
      { name: "SK Slavia Praha PADEL", address: "Vladivostocká 1460/10, Praha 10" },
      { name: "Padel Prosek", address: "Vysočanská 546/55, Praha 9" },
      { name: "Padel Club Spoje", address: "Koněvova 240, Praha 3" },
      { name: "Padel Liberec", address: "Dr. Milady Horákové 787/78, Liberec" },
      { name: "Padel court", address: "Praha 10" },
    ],
  },
  {
    region: "South Moravian Region",
    courts: [
      { name: "Padel Club Brno", address: "Údolní 33, Brno" },
      { name: "Padel Powers Kraví Hora", address: "Kraví Hora, Brno" },
      { name: "Padel Březí", address: "Březí u Mikulova" },
    ],
  },
  {
    region: "Other Cities & Regions",
    courts: [
      { name: "Padel centrum Nový Jičín", address: "Nový Jičín" },
      { name: "PADEL Klatovy", address: "Klatovy, Plzeň Region" },
      { name: "Padel Space", address: "Osoblaha, Moravia-Silesia Region" },
    ],
  },
];

interface CourtPickerProps {
  value: string;
  onChange: (value: string) => void;
}

export function CourtPicker({ value, onChange }: CourtPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [customValue, setCustomValue] = useState("");

  const q = search.toLowerCase();
  const filtered = COURTS.map((g) => ({
    ...g,
    courts: g.courts.filter(
      (c) => c.name.toLowerCase().includes(q) || c.address.toLowerCase().includes(q)
    ),
  })).filter((g) => g.courts.length > 0);

  const handleSelect = (court: Court) => {
    onChange(court.name);
    setIsCustom(false);
    setSearch("");
    setOpen(false);
  };

  const handleOther = () => {
    setIsCustom(true);
    setOpen(false);
    setSearch("");
  };

  if (isCustom) {
    return (
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Type court name / address…"
          value={customValue || value}
          onChange={(e) => {
            setCustomValue(e.target.value);
            onChange(e.target.value);
          }}
          className="h-11 pl-10 pr-9"
          autoFocus
        />
        <button
          type="button"
          onClick={() => {
            setIsCustom(false);
            setCustomValue("");
            onChange("");
          }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="w-full h-11 px-3 flex items-center gap-2 bg-background border border-input rounded-md text-sm hover:bg-accent transition-colors text-left"
        >
          <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className={`flex-1 truncate ${value ? "text-foreground" : "text-muted-foreground"}`}>
            {value || "Select court…"}
          </span>
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start" sideOffset={4}>
        <div className="flex items-center border-b px-3">
          <Search className="w-4 h-4 text-muted-foreground shrink-0 mr-2" />
          <input
            className="flex h-10 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
            placeholder="Search courts…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <ScrollArea className="max-h-64">
          <div className="p-1">
            {filtered.map((group) => (
              <div key={group.region}>
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {group.region}
                </div>
                {group.courts.map((court) => (
                  <button
                    key={court.name}
                    type="button"
                    onClick={() => handleSelect(court)}
                    className={`w-full text-left px-2 py-2 rounded-sm text-sm hover:bg-accent transition-colors ${
                      value === court.name ? "bg-accent" : ""
                    }`}
                  >
                    <div className="font-medium">{court.name}</div>
                    <div className="text-xs text-muted-foreground">{court.address}</div>
                  </button>
                ))}
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="py-4 text-center text-sm text-muted-foreground">No courts found</div>
            )}
            <div className="border-t mt-1 pt-1">
              <button
                type="button"
                onClick={handleOther}
                className="w-full text-left px-2 py-2 rounded-sm text-sm hover:bg-accent transition-colors text-muted-foreground"
              >
                ✏️ Other — type in manually
              </button>
            </div>
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
