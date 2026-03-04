import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";

interface SetScore {
  t1: number;
  t2: number;
}

interface ScoreScrollPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  setScores: SetScore[];
  onConfirm: (setScores: SetScore[], setsWonT1: number, setsWonT2: number) => void;
}

const allGameScores = Array.from({ length: 8 }, (_, i) => i.toString()); // 0-7

const ITEM_HEIGHT = 40;
const VISIBLE_ITEMS = 5;
const CONTAINER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;
const PADDING = ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2);

function ScrollColumn({
  items,
  selected,
  onSelect,
}: {
  items: string[];
  selected: string;
  onSelect: (val: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isUserScrolling = useRef(false);
  const snapTimer = useRef<ReturnType<typeof setTimeout>>();

  const scrollToIndex = useCallback((index: number, smooth = true) => {
    if (!ref.current) return;
    ref.current.scrollTo({
      top: index * ITEM_HEIGHT,
      behavior: smooth ? "smooth" : "auto",
    });
  }, []);

  useEffect(() => {
    const index = items.indexOf(selected);
    if (index !== -1 && !isUserScrolling.current) {
      setTimeout(() => scrollToIndex(index, false), 30);
    }
  }, [items, selected, scrollToIndex]);

  const snapToNearest = useCallback(() => {
    if (!ref.current) return;
    const scrollTop = ref.current.scrollTop;
    const index = Math.round(scrollTop / ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(index, items.length - 1));
    // Snap position
    const targetTop = clampedIndex * ITEM_HEIGHT;
    if (Math.abs(scrollTop - targetTop) > 1) {
      ref.current.scrollTo({ top: targetTop, behavior: "smooth" });
    }
    onSelect(items[clampedIndex]);
    isUserScrolling.current = false;
  }, [items, onSelect]);

  const handleScroll = useCallback(() => {
    isUserScrolling.current = true;
    if (snapTimer.current) clearTimeout(snapTimer.current);
    snapTimer.current = setTimeout(snapToNearest, 60);
  }, [snapToNearest]);

  const handleClick = useCallback(
    (index: number) => {
      isUserScrolling.current = true;
      scrollToIndex(index, true);
      setTimeout(() => {
        onSelect(items[index]);
        isUserScrolling.current = false;
      }, 200);
    },
    [items, onSelect, scrollToIndex]
  );

  // Handle touch end for immediate snap
  const handleTouchEnd = useCallback(() => {
    if (snapTimer.current) clearTimeout(snapTimer.current);
    snapTimer.current = setTimeout(snapToNearest, 40);
  }, [snapToNearest]);

  return (
    <div className="relative" style={{ height: CONTAINER_HEIGHT }}>
      <div
        className="absolute inset-x-0 z-0 rounded-lg bg-primary/10"
        style={{ top: PADDING, height: ITEM_HEIGHT }}
      />
      <div className="absolute inset-x-0 top-0 z-10 pointer-events-none bg-gradient-to-b from-background to-transparent" style={{ height: PADDING }} />
      <div className="absolute inset-x-0 bottom-0 z-10 pointer-events-none bg-gradient-to-t from-background to-transparent" style={{ height: PADDING }} />

      <div
        ref={ref}
        onScroll={handleScroll}
        onTouchEnd={handleTouchEnd}
        onMouseUp={handleTouchEnd}
        className="h-full overflow-y-auto scrollbar-hide relative z-[1]"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch", scrollSnapType: "y mandatory" }}
      >
        <div style={{ height: PADDING, scrollSnapAlign: "none" }} />
        {items.map((item, i) => (
          <button
            key={item}
            type="button"
            onClick={() => handleClick(i)}
            className={cn(
              "w-full flex items-center justify-center text-lg font-semibold transition-all",
              item === selected ? "text-primary scale-105" : "text-muted-foreground/60"
            )}
            style={{ height: ITEM_HEIGHT, scrollSnapAlign: "start" }}
          >
            {item}
          </button>
        ))}
        <div style={{ height: PADDING, scrollSnapAlign: "none" }} />
      </div>
    </div>
  );
}

export function ScoreScrollPicker({
  open,
  onOpenChange,
  setScores: initialSetScores,
  onConfirm,
}: ScoreScrollPickerProps) {
  const [sets, setSets] = useState<SetScore[]>(() =>
    initialSetScores.length > 0 ? initialSetScores : [{ t1: 0, t2: 0 }]
  );
  const [activeSet, setActiveSet] = useState(0);

  useEffect(() => {
    if (open) {
      const initial = initialSetScores.length > 0 ? initialSetScores : [{ t1: 0, t2: 0 }];
      setSets(initial);
      setActiveSet(0);
    }
  }, [open, initialSetScores]);

  const updateSet = (index: number, team: "t1" | "t2", value: string) => {
    const numVal = parseInt(value);
    setSets((prev) => {
      const next = [...prev];
      const updated = { ...next[index], [team]: numVal };
      // When one team reaches 7, auto-set the other to 6
      if (team === "t1" && updated.t1 === 7 && updated.t2 > 6) {
        updated.t2 = 6;
      } else if (team === "t2" && updated.t2 === 7 && updated.t1 > 6) {
        updated.t1 = 6;
      }
      next[index] = updated;
      return next;
    });
  };

  const addSet = () => {
    if (sets.length < 3) {
      setSets((prev) => [...prev, { t1: 0, t2: 0 }]);
      setActiveSet(sets.length);
    }
  };

  const removeSet = (index: number) => {
    if (sets.length <= 1) return;
    setSets((prev) => prev.filter((_, i) => i !== index));
    setActiveSet(Math.max(0, activeSet - 1));
  };

  const handleConfirm = () => {
    const setsWonT1 = sets.filter((s) => s.t1 > s.t2).length;
    const setsWonT2 = sets.filter((s) => s.t2 > s.t1).length;
    onConfirm(sets, setsWonT1, setsWonT2);
    onOpenChange(false);
  };

  const currentSet = sets[activeSet] || { t1: 0, t2: 0 };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[370px] p-0">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="text-center text-base">Set Score</DialogTitle>
        </DialogHeader>

        {/* Set tabs */}
        <div className="flex items-center justify-center gap-1.5 px-4">
          {sets.map((s, i) => (
            <button
              key={i}
              onClick={() => setActiveSet(i)}
              className={cn(
                "relative px-3 py-1.5 rounded-full text-xs font-semibold transition-colors",
                i === activeSet
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              Set {i + 1}
              <span className="ml-1 opacity-70">({s.t1}-{s.t2})</span>
            </button>
          ))}
          {sets.length < 3 && (
            <button
              onClick={addSet}
              className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-muted/80 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Score pickers for active set */}
        <div className="px-4 py-2">
          <div className="flex items-center justify-center gap-3">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider w-10 text-center leading-tight">Team<br/>1</p>
            <div className="w-14">
              <ScrollColumn
                items={currentSet.t2 === 7 ? allGameScores.slice(0, 7) : allGameScores}
                selected={String(currentSet.t1)}
                onSelect={(v) => updateSet(activeSet, "t1", v)}
              />
            </div>
            <div className="flex items-center justify-center w-6" style={{ height: CONTAINER_HEIGHT }}>
              <span className="text-2xl font-bold text-muted-foreground">-</span>
            </div>
            <div className="w-14">
              <ScrollColumn
                items={currentSet.t1 === 7 ? allGameScores.slice(0, 7) : allGameScores}
                selected={String(currentSet.t2)}
                onSelect={(v) => updateSet(activeSet, "t2", v)}
              />
            </div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider w-10 text-center leading-tight">Team<br/>2</p>
          </div>
        </div>

        {/* Remove set button */}
        {sets.length > 1 && (
          <div className="flex justify-center">
            <button
              onClick={() => removeSet(activeSet)}
              className="text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              Remove Set {activeSet + 1}
            </button>
          </div>
        )}

        {/* Summary */}
        <div className="px-4 text-center">
          <p className="text-sm text-muted-foreground">
            {sets.map((s, i) => `${s.t1}-${s.t2}`).join(" / ")}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Sets: {sets.filter((s) => s.t1 > s.t2).length} - {sets.filter((s) => s.t2 > s.t1).length}
          </p>
        </div>

        <div className="px-4 pb-4">
          <Button variant="hero" className="w-full" onClick={handleConfirm}>
            Confirm Score
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
