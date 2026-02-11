import { useRef, useEffect, useCallback, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TimeScrollPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  onChange: (time: string) => void;
}

const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"));
const minutes = ["00", "15", "30", "45"];

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

  // Scroll to selected on mount
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

      // Snap to nearest item
      scrollToIndex(clampedIndex, true);

      // Use functional update pattern to avoid stale state
      onSelect(items[clampedIndex]);
    }, 80);
  }, [items, onSelect, scrollToIndex]);

  const handleClick = useCallback(
    (index: number) => {
      scrollToIndex(index, true);
      // Select after scroll animation
      setTimeout(() => onSelect(items[index]), 200);
    },
    [items, onSelect, scrollToIndex]
  );

  return (
    <div className="relative" style={{ height: CONTAINER_HEIGHT }}>
      {/* Highlight band */}
      <div
        className="absolute inset-x-0 z-0 rounded-lg bg-primary/10"
        style={{ top: PADDING, height: ITEM_HEIGHT }}
      />
      {/* Fade edges */}
      <div className="absolute inset-x-0 top-0 z-10 pointer-events-none bg-gradient-to-b from-background to-transparent" style={{ height: PADDING }} />
      <div className="absolute inset-x-0 bottom-0 z-10 pointer-events-none bg-gradient-to-t from-background to-transparent" style={{ height: PADDING }} />

      <div
        ref={ref}
        onScroll={handleScroll}
        className="h-full overflow-y-auto scrollbar-hide relative z-[1]"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {/* Top padding */}
        <div style={{ height: PADDING }} />
        {items.map((item, i) => (
          <button
            key={item}
            type="button"
            onClick={() => handleClick(i)}
            className={cn(
              "w-full flex items-center justify-center text-xl font-semibold transition-all",
              item === selected
                ? "text-primary scale-105"
                : "text-muted-foreground/60"
            )}
            style={{ height: ITEM_HEIGHT }}
          >
            {item}
          </button>
        ))}
        {/* Bottom padding */}
        <div style={{ height: PADDING }} />
      </div>
    </div>
  );
}

export function TimeScrollPicker({ open, onOpenChange, value, onChange }: TimeScrollPickerProps) {
  const [hour, setHour] = useState(() => value?.split(":")[0] ?? "18");
  const [minute, setMinute] = useState(() => value?.split(":")[1] ?? "00");

  // Sync when dialog opens
  useEffect(() => {
    if (open && value) {
      const [h, m] = value.split(":");
      setHour(h);
      setMinute(m);
    }
  }, [open, value]);

  const handleConfirm = () => {
    onChange(`${hour}:${minute}`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[280px] p-0">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="text-center text-base">Select Time</DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-center gap-1 px-6 pb-2">
          <div className="w-20">
            <ScrollColumn items={hours} selected={hour} onSelect={setHour} />
          </div>
          <span className="text-2xl font-bold text-primary pb-1">:</span>
          <div className="w-20">
            <ScrollColumn items={minutes} selected={minute} onSelect={setMinute} />
          </div>
        </div>

        <div className="px-4 pb-4">
          <Button className="w-full" onClick={handleConfirm}>
            Confirm {hour}:{minute}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
