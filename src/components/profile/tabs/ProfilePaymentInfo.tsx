import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CreditCard, ChevronDown, ChevronUp, Pencil, ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Props {
  userId: string;
  bankDetails: string | null;
  bankQrUrl: string | null;
  onSaved: () => void;
}

export function ProfilePaymentInfo({ userId, bankDetails, bankQrUrl, onSaved }: Props) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(bankDetails || "");
  const [qrUrl, setQrUrl] = useState(bankQrUrl);
  const [uploading, setUploading] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ bank_details: form, bank_qr_url: qrUrl } as any).eq("user_id", userId);
    if (error) toast.error("Failed to save");
    else { toast.success("Saved!"); setEditing(false); onSaved(); }
    setSaving(false);
  };

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fileName = `${userId}/qr-${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("avatars").upload(fileName, file);
    if (error) { toast.error("Upload failed"); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(fileName);
    setQrUrl(publicUrl);
    setUploading(false);
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl overflow-hidden">
        <CollapsibleTrigger className="w-full flex items-center justify-between px-4 py-3.5">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-white/40" />
            <span className="text-[11px] font-semibold text-white/50 uppercase tracking-[0.1em]">Payment Info</span>
            {bankDetails && <span className="text-[10px] bg-[#14b8a6]/20 text-[#14b8a6] px-1.5 py-0.5 rounded-full font-medium">Set</span>}
          </div>
          {open ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4 pt-1 border-t border-white/10 space-y-3">
            {editing ? (
              <>
                <p className="text-xs text-white/40">Add your account number, Revolut tag, or upload a QR code.</p>
                <textarea
                  className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm text-white resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#14b8a6] min-h-[80px] placeholder:text-white/20"
                  placeholder="Revolut: @yourname&#10;Bank: 1234 5678"
                  value={form}
                  onChange={e => setForm(e.target.value)}
                />
                <div className="space-y-2">
                  <Label className="text-xs text-white/50">QR Code</Label>
                  {qrUrl ? (
                    <div className="relative inline-block">
                      <img src={qrUrl} alt="QR" className="w-28 h-28 object-contain rounded-lg border border-white/20 bg-white" />
                      <button onClick={() => setQrUrl(null)} className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-white/40 hover:text-white/60 border border-dashed border-white/20 rounded-xl px-3 py-3 w-fit">
                      <ImagePlus className="w-4 h-4" />
                      {uploading ? "Uploading..." : "Upload QR"}
                      <input type="file" accept="image/*" className="hidden" onChange={handleQrUpload} disabled={uploading} />
                    </label>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 text-xs border-white/20 text-white/60 hover:bg-white/10" onClick={() => { setForm(bankDetails || ""); setQrUrl(bankQrUrl); setEditing(false); }}>Cancel</Button>
                  <Button size="sm" className="flex-1 text-xs bg-[#14b8a6] hover:bg-[#14b8a6]/80 text-white" onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
                </div>
              </>
            ) : bankDetails || bankQrUrl ? (
              <div className="space-y-2">
                {bankDetails && <pre className="text-xs text-white/70 whitespace-pre-wrap font-sans bg-white/5 rounded-xl px-3 py-2.5">{bankDetails}</pre>}
                {bankQrUrl && <img src={bankQrUrl} alt="QR" className="w-28 h-28 object-contain rounded-lg border border-white/20 bg-white" />}
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-white/40 hover:text-white/60 hover:bg-white/5" onClick={() => setEditing(true)}>
                  <Pencil className="w-3 h-3" /> Edit
                </Button>
              </div>
            ) : (
              <div className="text-center py-2">
                <p className="text-xs text-white/30 mb-2">No payment info added.</p>
                <Button variant="outline" size="sm" className="text-xs border-white/20 text-white/50 hover:bg-white/10" onClick={() => setEditing(true)}>Add Payment Info</Button>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
