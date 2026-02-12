import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Filter, X } from "lucide-react";
import { useState } from "react";

interface MobileFilterSheetProps {
  skillFilter: string;
  setSkillFilter: (value: string) => void;
  formatFilter: string;
  setFormatFilter: (value: string) => void;
}

export function MobileFilterSheet({
  skillFilter,
  setSkillFilter,
  formatFilter,
  setFormatFilter,
}: MobileFilterSheetProps) {
  const [open, setOpen] = useState(false);

  const hasActiveFilters = skillFilter !== "all" || formatFilter !== "all";
  
  const clearFilters = () => {
    setSkillFilter("all");
    setFormatFilter("all");
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="outline" 
          size="icon" 
          className="h-11 w-11 shrink-0 relative"
        >
          <Filter className="w-4 h-4" />
          {hasActiveFilters && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full" />
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-auto rounded-t-3xl">
        <SheetHeader className="pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="font-display">Filter Games</SheetTitle>
            {hasActiveFilters && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearFilters}
                className="text-muted-foreground"
              >
                Clear all
              </Button>
            )}
          </div>
        </SheetHeader>
        
        <div className="space-y-5 pb-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Skill Level
            </label>
            <Select value={skillFilter} onValueChange={setSkillFilter}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="All Levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="2">Level 2+</SelectItem>
                <SelectItem value="3">Level 3+</SelectItem>
                <SelectItem value="4">Level 4+</SelectItem>
                <SelectItem value="5">Level 5</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Game Format
            </label>
            <Select value={formatFilter} onValueChange={setFormatFilter}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="All Formats" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Formats</SelectItem>
                <SelectItem value="casual_match">Casual Match</SelectItem>
                <SelectItem value="americano">Americano</SelectItem>
                <SelectItem value="team_americano">Team Americano</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button 
            variant="hero" 
            className="w-full h-12 mt-4" 
            onClick={() => setOpen(false)}
          >
            Show Results
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
