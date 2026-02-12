import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Users, Trophy, Building2, UserCheck } from "lucide-react";
import { motion } from "framer-motion";

export type HostType = "find_players" | "americano" | "sell_court" | "sell_spots";

interface HostTypeOption {
  type: HostType;
  icon: React.ReactNode;
  emoji: string;
  title: string;
  description: string;
}

const hostTypes: HostTypeOption[] = [
  {
    type: "find_players",
    emoji: "🎾",
    icon: <Users className="w-5 h-5" />,
    title: "Find Players",
    description: "Create a casual match and find players to join",
  },
  {
    type: "americano",
    emoji: "🏆",
    icon: <Trophy className="w-5 h-5" />,
    title: "Host Americano",
    description: "Organize an Americano or Team Americano tournament",
  },
  {
    type: "sell_court",
    emoji: "🏟️",
    icon: <Building2 className="w-5 h-5" />,
    title: "Sell / Give Away Court",
    description: "You have a court booked and want to sell or share it",
  },
  {
    type: "sell_spots",
    emoji: "🔄",
    icon: <UserCheck className="w-5 h-5" />,
    title: "Find Backup",
    description: "Sell your spot or find a replacement player",
  },
];

interface HostTypeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HostTypeModal({ open, onOpenChange }: HostTypeModalProps) {
  const navigate = useNavigate();

  const handleSelect = (type: HostType) => {
    onOpenChange(false);
    navigate(`/games/create?type=${type}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 gap-0 rounded-2xl overflow-hidden">
        <div className="p-5 pb-3">
          <h2 className="font-display text-lg font-bold">What do you want to do?</h2>
          <p className="text-sm text-muted-foreground mt-1">Choose how you'd like to host</p>
        </div>
        <div className="px-4 pb-5 space-y-2">
          {hostTypes.map((option, i) => (
            <motion.button
              key={option.type}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => handleSelect(option.type)}
              className="w-full flex items-center gap-3.5 p-3.5 rounded-xl border-2 border-border hover:border-primary/50 hover:bg-accent/50 transition-all text-left group"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary group-hover:bg-primary/20 transition-colors">
                <span className="text-lg">{option.emoji}</span>
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm">{option.title}</p>
                <p className="text-xs text-muted-foreground leading-snug">{option.description}</p>
              </div>
            </motion.button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
