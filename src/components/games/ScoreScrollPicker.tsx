import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ScoreScrollPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team1Score: number;
  team2Score: number;
  onConfirm: (t1: number, t2: number) => void;
  team1Label?: string;
  team2Label?: string;
}

const scores = Array.from({ length: 31 }, (_, i) => i.toString());

const ITEM_HEIGHT = 44;
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
  const scrollTimeout = useRef<ReturnType<typeof setTimeout>>();

  const scrollToIndex = useCallback((index: number, smooth = true) => {
    if (!ref.current) return;
    ref.current.scrollTo({
      top: index * ITEM_HEIGHT,
      behavior: smooth ? "smooth" : "auto",
    });
  }, []);

  useEffect(() => {
    const index = items.indexOf(selected);
    if (index !== -1) {
      setTimeout(() => scrollToIndex(index, false), 50);
    }
  }, [items, selected, scrollToIndex]);

  const handleScroll = useCallback(() => {
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    scrollTimeout.current = setTimeout(() => {
      if (!ref.current) return;
      const scrollTop = ref.current.scrollTop;
      const index = Math.round(scrollTop / ITEM_HEIGHT);
      const clampedIndex = Math.max(0, Math.min(index, items.length - 1));
      scrollToIndex(clampedIndex, true);
      onSelect(items[clampedIndex]);
    }, 80);
  }, [items, onSelect, scrollToIndex]);

  const handleClick = useCallback(
    (index: number) => {
      scrollToIndex(index, true);
      setTimeout(() => onSelect(items[index]), 200);
    },
    [items, onSelect, scrollToIndex]
  );

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
        className="h-full overflow-y-auto scrollbar-hide relative z-[1]"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        <div style={{ height: PADDING }} />
        {items.map((item, i) => (
          <button
            key={item}
            type="button"
            onClick={() => handleClick(i)}
            className={cn(
              "w-full flex items-center justify-center text-xl font-semibold transition-all",
              item === selected ? "text-primary scale-105" : "text-muted-foreground/60"
            )}
            style={{ height: ITEM_HEIGHT }}
          >
            {item}
          </button>
        ))}
        <div style={{ height: PADDING }} />
      </div>
    </div>
  );
}

export function ScoreScrollPicker({
  open,
  onOpenChange,
  team1Score,
  team2Score,
  onConfirm,
  team1Label = "Team 1",
  team2Label = "Team 2",
}: ScoreScrollPickerProps) {
  const [t1, setT1] = useState(() => String(team1Score));
  const [t2, setT2] = useState(() => String(team2Score));

  useEffect(() => {
    if (open) {
      setT1(String(team1Score));
      setT2(String(team2Score));
    }
  }, [open, team1Score, team2Score]);

  const handleConfirm = () => {
    onConfirm(parseInt(t1), parseInt(t2));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[300px] p-0">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="text-center text-base">Set Score</DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-center gap-2 px-6 pb-2">
          <div className="flex flex-col items-center gap-1">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{team1Label}</p>
            <div className="w-16">
              <ScrollColumn items={scores} selected={t1} onSelect={setT1} />
            </div>
          </div>
          <span className="text-2xl font-bold text-muted-foreground mt-4">-</span>
          <div className="flex flex-col items-center gap-1">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{team2Label}</p>
            <div className="w-16">
              <ScrollColumn items={scores} selected={t2} onSelect={setT2} />
            </div>
          </div>
        </div>

        <div className="px-4 pb-4">
          <Button variant="hero" className="w-full" onClick={handleConfirm}>
            Confirm {t1} - {t2}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
