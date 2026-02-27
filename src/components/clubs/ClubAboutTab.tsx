import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MapPin, Globe, Instagram, Calendar, Hash } from "lucide-react";
import { format } from "date-fns";

interface Club {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  city: string | null;
  country: string | null;
  num_courts: number | null;
  instagram_url: string | null;
  website_url: string | null;
}

interface Admin {
  user_id: string;
  role: string;
  name: string;
  avatar_url: string | null;
}

export default function ClubAboutTab({ club, ownerId }: { club: Club; ownerId: string }) {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchAdmins();
  }, [club.id]);

  const fetchAdmins = async () => {
    const { data: followers } = await supabase
      .from("club_followers")
      .select("user_id, role")
      .eq("club_id", club.id)
      .eq("status", "active")
      .in("role", ["owner", "admin"]);

    if (!followers || followers.length === 0) return;

    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, name, avatar_url")
      .in("user_id", followers.map(f => f.user_id));

    const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
    setAdmins(followers.map(f => ({
      ...f,
      name: profileMap.get(f.user_id)?.name || "Unknown",
      avatar_url: profileMap.get(f.user_id)?.avatar_url || null,
    })));
  };

  // Parse description - strip emoji-prefixed social lines (legacy format)
  const cleanDescription = (desc: string | null) => {
    if (!desc) return "";
    return desc
      .split("\n")
      .filter(l => !l.match(/^[📍🌐📸💬]/))
      .join("\n")
      .trim();
  };

  const description = cleanDescription(club.description);
  const location = [club.city, club.country].filter(Boolean).join(", ");

  return (
    <div className="space-y-4">
      {/* Description */}
      {description && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-display font-bold mb-2">Description</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-line">{description}</p>
        </div>
      )}

      {/* Info */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <h3 className="font-display font-bold mb-1">Info</h3>

        {location && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4 shrink-0" /> {location}
          </div>
        )}

        {club.num_courts && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Hash className="w-4 h-4 shrink-0" /> {club.num_courts} courts
          </div>
        )}

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="w-4 h-4 shrink-0" /> Founded {format(new Date(club.created_at), "MMMM yyyy")}
        </div>

        {club.instagram_url && (
          <a
            href={club.instagram_url.startsWith("http") ? club.instagram_url : `https://instagram.com/${club.instagram_url.replace("@", "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <Instagram className="w-4 h-4 shrink-0" /> {club.instagram_url}
          </a>
        )}

        {club.website_url && (
          <a
            href={club.website_url.startsWith("http") ? club.website_url : `https://${club.website_url}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <Globe className="w-4 h-4 shrink-0" /> {club.website_url}
          </a>
        )}
      </div>

      {/* Admins */}
      {admins.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-display font-bold mb-3">Admins</h3>
          <div className="space-y-2.5">
            {admins.map(a => (
              <div
                key={a.user_id}
                onClick={() => navigate(`/user/${a.user_id}`)}
                className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 rounded-lg p-1.5 -m-1.5 transition-colors"
              >
                <Avatar className="h-9 w-9 rounded-xl">
                  <AvatarImage src={a.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary font-bold rounded-xl">
                    {a.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium text-sm">{a.name}</span>
                {a.user_id === ownerId ? (
                  <Badge className="text-[10px] bg-[hsl(220,25%,10%)] text-white border-0 rounded px-1.5 py-0">Owner</Badge>
                ) : (
                  <Badge className="text-[10px] bg-primary text-primary-foreground border-0 rounded px-1.5 py-0">Admin</Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
