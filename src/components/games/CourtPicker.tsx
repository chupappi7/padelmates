import { useState, useCallback } from "react";
import { MapPin, ChevronDown, Search, X, Star } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

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
    region: "Prague & Central Bohemian Region",
    courts: [
      { name: "Padel Powers Praha Smíchov", address: "Křížová 6, 150 00 Praha 5 – Smíchov" },
      { name: "Padel Club Spoje", address: "Na Balkáně 990/21A, 130 00 Praha 3 – Vysočany" },
      { name: "Tenis & Padel klub Písečná Praha", address: "K Sadu 590/1, 182 00 Praha 8" },
      { name: "For Padel Sport Park Zdiměřice", address: "U Geofyzikálního ústavu, 252 42 Jesenice u Prahy–Zdiměřice" },
      { name: "TENIS CENTRUM HEAD – Vestec", address: "Sportovní 456, 252 50 Vestec – Jesenice u Prahy" },
      { name: "Czech Padel Academy", address: "Prague area – contact club for exact address" },
      { name: "Sportovní centrum EDEN Beroun", address: "Pod Homolkou 1482, 266 01 Beroun" },
    ],
  },
  {
    region: "Other Major Cities & Regions",
    courts: [
      { name: "Padel Powers Brno – Kraví Hora", address: "Rybkova 948/23, 602 00 Brno" },
      { name: "Padel Club Brno", address: "Dobrovského 96/29, 602 00 Brno" },
      { name: "Padel Klatovy", address: "Domažlická 609, 339 01 Klatovy" },
      { name: "Kurty Březno – Louny", address: "Březno u Postoloprt 122, 440 01 Louny" },
      { name: "Padel Centrum Nový Jičín", address: "Jiráskova (naproti gymnáziu), 741 01 Nový Jičín" },
      { name: "PADEL CLUB OSTRAVA", address: "Hladnovská 259/128, 700 30 Ostrava" },
      { name: "Trojhalí Karolina – Ostrava", address: "K Trojhalí 3361/5, 702 00 Ostrava" },
      { name: "SC Landek – Ostrava", address: "Pod Landekem 65, 710 00 Ostrava – Slezská Ostrava" },
    ],
  },
];

export const ALL_COURTS = COURTS.flatMap((g) => g.courts);

const FAVORITES_KEY = "padel_favorite_courts";

function loadFavorites(): string[] {
  try {
    return JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveFavorites(favs: string[]) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
}

interface CourtPickerProps {
  value: string;
  onChange: (value: string) => void;
}

export function CourtPicker({ value, onChange }: CourtPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [customValue, setCustomValue] = useState("");
  const [favorites, setFavorites] = useState<string[]>(loadFavorites);

  const toggleFavorite = useCallback((courtName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites((prev) => {
      const next = prev.includes(courtName)
        ? prev.filter((n) => n !== courtName)
        : [...prev, courtName];
      saveFavorites(next);
      return next;
    });
  }, []);

  const q = search.toLowerCase();
  const filtered = COURTS.map((g) => ({
    ...g,
    courts: g.courts.filter(
      (c) => c.name.toLowerCase().includes(q) || c.address.toLowerCase().includes(q)
    ),
  })).filter((g) => g.courts.length > 0);

  const favCourts = ALL_COURTS.filter((c) => favorites.includes(c.name));
  const filteredFavs = favCourts.filter(
    (c) => c.name.toLowerCase().includes(q) || c.address.toLowerCase().includes(q)
  );

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

  const renderCourt = (court: Court) => {
    const isFav = favorites.includes(court.name);
    return (
      <button
        key={court.name}
        type="button"
        onClick={() => handleSelect(court)}
        className={`w-full text-left px-2 py-2 rounded-sm text-sm hover:bg-accent transition-colors flex items-start gap-2 ${
          value === court.name ? "bg-accent" : ""
        }`}
      >
        <div className="flex-1 min-w-0">
          <div className="font-medium">{court.name}</div>
        </div>
        <button
          type="button"
          onClick={(e) => toggleFavorite(court.name, e)}
          className="shrink-0 mt-0.5 p-1 rounded hover:bg-primary/10 transition-colors"
        >
          <Star
            className={`w-3.5 h-3.5 ${isFav ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
          />
        </button>
      </button>
    );
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
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 z-50" align="start" sideOffset={4}>
        <div className="flex items-center border-b px-3">
          <Search className="w-4 h-4 text-muted-foreground shrink-0 mr-2" />
          <input
            className="flex h-10 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
            placeholder="Search courts…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="max-h-64 overflow-y-auto p-1">
          {/* Favorites section */}
          {filteredFavs.length > 0 && (
            <div>
              <div className="px-2 py-1.5 text-xs font-semibold text-yellow-500 uppercase tracking-wider flex items-center gap-1">
                <Star className="w-3 h-3 fill-yellow-400" />
                Favorites
              </div>
              {filteredFavs.map(renderCourt)}
              <div className="h-px bg-border my-1" />
            </div>
          )}

          {/* All courts by region */}
          {filtered.map((group) => (
            <div key={group.region}>
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {group.region}
              </div>
              {group.courts.map(renderCourt)}
            </div>
          ))}
          {filtered.length === 0 && filteredFavs.length === 0 && (
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
      </PopoverContent>
    </Popover>
  );
}
