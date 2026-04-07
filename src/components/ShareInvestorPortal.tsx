import { useState } from "react";
import { Share2, Link2, Copy, Check, Mail, Users, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const recipientTypes = [
  { label: "Capital Partner", icon: Users },
  { label: "Buyer / Acquirer", icon: Users },
  { label: "Broker", icon: Share2 },
  { label: "Strategic Partner", icon: Share2 },
  { label: "Board Member", icon: Lock },
];

interface ShareInvestorPortalProps {
  clientName?: string;
  variant?: "button" | "card";
}

const ShareInvestorPortal = ({ clientName = "your client", variant = "button" }: ShareInvestorPortalProps) => {
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState(false);
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [expiry, setExpiry] = useState("14");

  const shareUrl = `${window.location.origin}/investor?to=${encodeURIComponent(recipientName || "Partner")}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const trigger = variant === "card" ? (
    <button className="w-full bg-card rounded-lg border border-border p-5 flex items-center gap-4 hover:bg-muted/30 transition-colors text-left">
      <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Share2 className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-foreground">Share Investor Portal</p>
        <p className="text-xs text-muted-foreground">Generate a secure, watermarked link for external partners</p>
      </div>
    </button>
  ) : (
    <Button variant="outline" size="sm" className="gap-2">
      <Share2 className="w-3.5 h-3.5" />
      Share Portal
    </Button>
  );

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">Share Investor Portal</DialogTitle>
          <DialogDescription>
            Generate a secure, expiring link for <span className="font-medium text-foreground">{clientName}</span>'s capital readiness materials.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Recipient */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-foreground">Recipient Name</label>
            <input
              type="text"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              placeholder="e.g. Jane Smith"
              className="w-full px-3 py-2.5 rounded-md border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-foreground">Recipient Email</label>
            <input
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="jane@capitalpartners.com"
              className="w-full px-3 py-2.5 rounded-md border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Recipient Type */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-foreground">Recipient Type</label>
            <div className="flex flex-wrap gap-2">
              {recipientTypes.map(t => (
                <button
                  key={t.label}
                  onClick={() => setSelectedType(t.label)}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-medium transition-colors border",
                    selectedType === t.label
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-input hover:text-foreground"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Expiry */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-foreground">Link Expires In</label>
            <div className="flex gap-2">
              {["7", "14", "30"].map(d => (
                <button
                  key={d}
                  onClick={() => setExpiry(d)}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-medium transition-colors border",
                    expiry === d
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-input hover:text-foreground"
                  )}
                >
                  {d} days
                </button>
              ))}
            </div>
          </div>

          {/* Generated Link */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-foreground">Secure Link</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3 py-2.5 rounded-md border border-input bg-muted text-xs text-muted-foreground truncate">
                {shareUrl}
              </div>
              <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5 flex-shrink-0">
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              className={cn(
                "flex-1 gap-2 transition-colors",
                sent ? "bg-emerald-600 hover:bg-emerald-600 text-white" : ""
              )}
              onClick={() => {
                setSent(true);
                toast("Invitation sent", { description: `Secure link sent to ${recipientEmail || "recipient"}` });
                setTimeout(() => setSent(false), 3000);
              }}
            >
              {sent ? (
                <>
                  <Check className="w-4 h-4" />
                  Sent
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  Send Invitation
                </>
              )}
            </Button>
            <Button variant="outline" onClick={handleCopy} className="gap-2">
              <Link2 className="w-4 h-4" />
              Copy Link
            </Button>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-1">
            <Lock className="w-3 h-3" />
            <span>Downloads are watermarked with recipient identity. Access is logged.</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareInvestorPortal;
