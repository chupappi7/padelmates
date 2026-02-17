import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/layout/Navbar";
import { SkillBadge } from "@/components/games/SkillBadge";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Camera, Calendar, Trophy, Users, UserPlus, Copy, Check } from "lucide-react";
import { useFriends } from "@/hooks/useFriends";

function FriendCodeBox({ code }: { code: string | null }) {
  const [copied, setCopied] = useState(false);
  if (!code) return null;
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success("Friend code copied!");
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="mt-4 flex items-center justify-center gap-2 bg-muted/50 rounded-lg px-4 py-2 max-w-xs mx-auto">
      <span className="text-xs text-muted-foreground font-medium">Your Code</span>
      <code className="text-sm font-mono font-bold tracking-widest">{code}</code>
      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={handleCopy}>
        {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
      </Button>
    </div>
  );
}

interface Profile {
  id: string;
  name: string;
  avatar_url: string | null;
  skill_level: number;
  bio: string | null;
  games_played: number;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [matchStats, setMatchStats] = useState({ played: 0, wins: 0 });
  const { friends } = useFriends();

  const [formData, setFormData] = useState({
    name: "",
    bio: "",
    skill_level: 3 as number,
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchMatchStats();
    }
  }, [user]);

  const fetchProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user?.id)
      .single();

    if (data) {
      setProfile(data);
      setFormData({
        name: data.name,
        bio: data.bio || "",
        skill_level: data.skill_level,
      });
    }
    setLoading(false);
  };

  const fetchMatchStats = async () => {
    if (!user) return;
    // Get all match_players entries for this user
    const { data: myMatchPlayers } = await supabase
      .from("match_players")
      .select("match_id, team")
      .eq("user_id", user.id);

    if (!myMatchPlayers || myMatchPlayers.length === 0) return;

    const matchIds = myMatchPlayers.map((mp) => mp.match_id);
    const { data: matchesData } = await supabase
      .from("matches")
      .select("id, team1_score, team2_score, status")
      .in("id", matchIds)
      .eq("status", "completed");

    if (!matchesData) return;

    let wins = 0;
    matchesData.forEach((m) => {
      const mp = myMatchPlayers.find((p) => p.match_id === m.id);
      if (!mp) return;
      if (
        (mp.team === 1 && m.team1_score > m.team2_score) ||
        (mp.team === 2 && m.team2_score > m.team1_score)
      ) {
        wins++;
      }
    });

    setMatchStats({ played: matchesData.length, wins });
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        name: formData.name,
        bio: formData.bio,
        skill_level: formData.skill_level,
      })
      .eq("user_id", user.id);

    if (error) {
      toast.error("Failed to update profile");
    } else {
      toast.success("Profile updated!");
      setEditing(false);
      fetchProfile();
    }
    setSaving(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const fileName = `${user.id}/${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(fileName, file);

    if (uploadError) {
      toast.error("Failed to upload avatar");
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("avatars")
      .getPublicUrl(fileName);

    await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("user_id", user.id);

    toast.success("Avatar updated!");
    fetchProfile();
  };

  if (!user) {
    navigate("/login");
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-32 w-32 bg-muted rounded-full mx-auto" />
            <div className="h-8 w-48 bg-muted rounded mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container py-8 max-w-2xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="bg-card border border-border rounded-2xl p-8 text-center mb-6">
            <div className="relative inline-block mb-4">
              <Avatar className="h-24 w-24">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                  {profile?.name?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <label
                htmlFor="avatar"
                className="absolute bottom-0 right-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors"
              >
                <Camera className="w-4 h-4" />
              </label>
              <Input
                type="file"
                id="avatar"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>

            {editing ? (
              <div className="space-y-4 text-left">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Skill Level</Label>
                  <Select
                    value={String(formData.skill_level)}
                    onValueChange={(v) =>
                      setFormData((prev) => ({
                        ...prev,
                        skill_level: parseInt(v),
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">Level 2 – Beginner</SelectItem>
                      <SelectItem value="3">Level 3 – Intermediate</SelectItem>
                      <SelectItem value="4">Level 4 – Upper-Int</SelectItem>
                      <SelectItem value="5">Level 5 – Pro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Bio</Label>
                  <Textarea
                    value={formData.bio}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, bio: e.target.value }))
                    }
                    placeholder="Tell others about yourself..."
                  />
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setEditing(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="hero"
                    className="flex-1"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <h1 className="font-display text-2xl font-bold mb-2">
                  {profile?.name}
                </h1>
                <div className="flex justify-center mb-4">
                  <SkillBadge level={profile?.skill_level || 3} />
                </div>
                {profile?.bio && (
                  <p className="text-muted-foreground mb-4">{profile.bio}</p>
                )}
                <Button variant="outline" onClick={() => setEditing(true)}>
                  Edit Profile
                </Button>

                {/* User ID display */}
                <FriendCodeBox code={(profile as any)?.friend_code} />
              </>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-card border border-border rounded-xl p-4 text-center">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-2">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <p className="text-2xl font-bold">{matchStats.played || profile?.games_played || 0}</p>
              <p className="text-sm text-muted-foreground">Matches</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 text-center">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-2">
                <Trophy className="w-5 h-5 text-primary" />
              </div>
              <p className="text-2xl font-bold">{matchStats.wins}</p>
              <p className="text-sm text-muted-foreground">Wins</p>
            </div>
            <button
              onClick={() => navigate("/friends")}
              className="bg-card border border-border rounded-xl p-4 text-center hover:border-primary/50 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-2">
                <UserPlus className="w-5 h-5 text-primary" />
              </div>
              <p className="text-2xl font-bold">{friends.length}</p>
              <p className="text-sm text-muted-foreground">Friends</p>
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
