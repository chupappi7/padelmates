import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ScoreScrollPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialScore?: { t1: number; t2: number };
  onConfirm: (t1: number, t2: number) => void;
}

const allGameScores = Array.from({ length: 8 }, (_, i) => i.toString()); // 0-7

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
  const isScrolling = useRef(false);
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
    isScrolling.current = true;
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);

    scrollTimeout.current = setTimeout(() => {
      isScrolling.current = false;
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
  initialScore,
  onConfirm,
}: ScoreScrollPickerProps) {
  const [t1, setT1] = useState(initialScore?.t1 ?? 0);
  const [t2, setT2] = useState(initialScore?.t2 ?? 0);

  useEffect(() => {
    if (open) {
      setT1(initialScore?.t1 ?? 0);
      setT2(initialScore?.t2 ?? 0);
    }
  }, [open, initialScore]);

  const handleConfirm = () => {
    onConfirm(t1, t2);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[370px] p-0">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="text-center text-base">Score</DialogTitle>
        </DialogHeader>

        <div className="px-4 py-2">
          <div className="flex items-center justify-center gap-3">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider w-10 text-center leading-tight">Team<br/>1</p>
            <div className="w-14">
              <ScrollColumn
                items={t2 === 7 ? allGameScores.slice(0, 7) : allGameScores}
                selected={String(t1)}
                onSelect={(v) => {
                  const val = parseInt(v);
                  setT1(val);
                  if (val === 7 && t2 > 6) setT2(6);
                }}
              />
            </div>
            <div className="flex items-center justify-center w-6" style={{ height: CONTAINER_HEIGHT }}>
              <span className="text-2xl font-bold text-muted-foreground">-</span>
            </div>
            <div className="w-14">
              <ScrollColumn
                items={t1 === 7 ? allGameScores.slice(0, 7) : allGameScores}
                selected={String(t2)}
                onSelect={(v) => {
                  const val = parseInt(v);
                  setT2(val);
                  if (val === 7 && t1 > 6) setT1(6);
                }}
              />
            </div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider w-10 text-center leading-tight">Team<br/>2</p>
          </div>
        </div>

        <div className="px-4 text-center">
          <p className="text-lg font-bold tabular-nums">{t1} - {t2}</p>
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
