import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useClientContext } from "@/hooks/useClientContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  CalendarDays,
  CheckCircle2,
  Users,
  TrendingUp,
  FileText,
  Clock,
  Circle,
} from "lucide-react";

const fadeIn = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.4 },
  }),
};

// ---------------------------------------------------------------------------
// Mock review data
// ---------------------------------------------------------------------------
const currentReview = {
  quarter: "Q2",
  year: 2026,
  type: "Quarterly Review",
  date: "Jun 28, 2026",
  daysUntil: 47,
  objectives: [
    "Review Protection Architecture progress with insurance partner",
    "Assess Grow Lane engagement across Human Capital and Structural Capital",
    "Present Founder's Optionality Framework initial findings",
    "Set Q3 priorities and confirm Align commitments",
    "Review Wealth Gap analysis and update economic certainty targets",
  ],
};

const pastReviews = [
  {
    id: "rv-1",
    quarter: "Q1",
    year: 2026,
    type: "Quarterly Review",
    date: "Jan 15, 2026",
    status: "complete",
    findings: [
      "FBI score: 72 — strong in systems, weak in customer concentration",
      "Wealth Gap Analysis revealed $4.2M shortfall to founder target",
      "Capital Strategy Architecture finalized — entity restructuring recommended",
    ],
    milestones: [
      "Founder Business Index completed",
      "Economic Certainty Framework established",
      "Quarterly plan for Q2 set and signed off",
    ],
    referrals: 1,
    protectionPct: 20,
    valueEnhancementPct: 35,
    summary: `Q1 2026 QUARTERLY REVIEW SUMMARY
Jan 15, 2026

REVIEW HIGHLIGHTS
The Q1 2026 review established the baseline for the TFO engagement. The advisor team reviewed all Diagnose phase instruments and finalized the Capital Strategy Architecture.

KEY OUTCOMES
• Founder Business Index: 72/100 — strong systemic infrastructure
• Economic Certainty Target: $12.8M net to founder
• Current Business Value: ~$8.6M
• Wealth Gap: $4.2M — drives urgency for capital strategy

PROTECTION STATUS
20% of protection items in place. Priority gaps identified: key person insurance, buy-sell funding, entity restructuring.

VALUE ENHANCEMENT STATUS
35% complete. COO in place. SOP documentation 80% done. Customer concentration remains the primary risk factor.

Q2 COMMITMENTS
1. Complete Capital Strategy Architecture implementation
2. Engage HR partner for human capital engagement
3. Close key person insurance gap
4. Begin customer concentration reduction sprint

REFERRALS MADE
1 referral to HR partner for organizational assessment.`,
  },
];

// ---------------------------------------------------------------------------
// Objective item
// ---------------------------------------------------------------------------
const ObjectiveItem = ({ text, index }: { text: string; index: number }) => (
  <div className="flex items-start gap-3">
    <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center flex-shrink-0 mt-0.5">
      <span className="text-[9px] font-semibold text-muted-foreground">{index + 1}</span>
    </div>
    <p className="text-sm text-foreground leading-snug">{text}</p>
  </div>
);

// ---------------------------------------------------------------------------
// Schedule Review Dialog
// ---------------------------------------------------------------------------
const ScheduleDialog = ({ open, onClose, clientName }: { open: boolean; onClose: () => void; clientName: string }) => {
  const [selectedDate, setSelectedDate] = useState("Jun 28, 2026");
  const [selectedTime, setSelectedTime] = useState("10:00 AM");
  const [format, setFormat] = useState<"in_person" | "video">("video");
  const [scheduled, setScheduled] = useState(false);

  const handleSchedule = () => {
    setScheduled(true);
    setTimeout(() => {
      setScheduled(false);
      onClose();
    }, 2000);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Schedule Q2 Review</DialogTitle>
          <DialogDescription>
            Confirm the meeting details for the Q2 2026 Quarterly Review with {clientName}
          </DialogDescription>
        </DialogHeader>

        {scheduled ? (
          <div className="py-8 flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-emerald-600" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground">Review Scheduled</p>
              <p className="text-xs text-muted-foreground mt-1">{selectedDate} at {selectedTime} — calendar invite sent</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground">Date</label>
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option>Jun 28, 2026</option>
                <option>Jun 25, 2026</option>
                <option>Jul 1, 2026</option>
                <option>Jul 5, 2026</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground">Time</label>
              <select
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="w-full px-3 py-2.5 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option>9:00 AM</option>
                <option>10:00 AM</option>
                <option>11:00 AM</option>
                <option>2:00 PM</option>
                <option>3:00 PM</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground">Format</label>
              <div className="flex gap-2">
                {[
                  { val: "video" as const, label: "Video Call" },
                  { val: "in_person" as const, label: "In Person" },
                ].map((f) => (
                  <button
                    key={f.val}
                    onClick={() => setFormat(f.val)}
                    className={cn(
                      "flex-1 px-3 py-2 rounded-md text-xs font-medium transition-colors border",
                      format === f.val
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted-foreground border-input hover:text-foreground"
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-lg bg-muted/40 border border-border p-3 text-xs text-muted-foreground">
              <p><span className="font-medium text-foreground">Attendees:</span> {clientName}, TFO Advisor</p>
              <p className="mt-1"><span className="font-medium text-foreground">Duration:</span> 90 minutes</p>
              <p className="mt-1"><span className="font-medium text-foreground">Agenda:</span> {currentReview.objectives.length} objectives scheduled</p>
            </div>
          </div>
        )}

        {!scheduled && (
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSchedule} className="gap-2">
              <CalendarDays className="w-4 h-4" /> Confirm & Send Invite
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};

// ---------------------------------------------------------------------------
// Past Review Detail Dialog
// ---------------------------------------------------------------------------
const ReviewDetailDialog = ({
  review,
  onClose,
  clientName,
  clientContact,
}: {
  review: typeof pastReviews[number] | null;
  onClose: () => void;
  clientName: string;
  clientContact: string;
}) => {
  if (!review) return null;
  return (
    <Dialog open={!!review} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display">
            {review.quarter} {review.year} — {review.type}
          </DialogTitle>
          <DialogDescription>{review.date} · {clientName} · {clientContact}</DialogDescription>
        </DialogHeader>
        <div className="rounded-lg bg-muted/30 border border-border p-5 max-h-96 overflow-y-auto">
          <pre className="text-xs text-foreground whitespace-pre-wrap font-mono leading-relaxed">
            {review.summary}
          </pre>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={() => onClose()} className="gap-2">
            <FileText className="w-4 h-4" /> Download Summary
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
const QuarterlyReviewPage = () => {
  const { selectedClient } = useClientContext();
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState<typeof pastReviews[number] | null>(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <h1 className="text-3xl font-display font-semibold text-foreground">Quarterly Reviews</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Structured engagement reviews — {selectedClient.name}
        </p>
      </motion.div>

      {/* Upcoming Review Card */}
      <motion.div custom={0} initial="hidden" animate="visible" variants={fadeIn}>
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          {/* Gold header bar */}
          <div className="gradient-gold px-6 py-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-accent-foreground/80 uppercase tracking-wider">
                Upcoming Review
              </p>
              <p className="text-lg font-display font-bold text-accent-foreground mt-0.5">
                {currentReview.quarter} {currentReview.year} — {currentReview.type}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-accent-foreground">{currentReview.daysUntil}</p>
              <p className="text-xs text-accent-foreground/70">days until review</p>
            </div>
          </div>

          <div className="p-6 space-y-5">
            {/* Date and metadata */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4" />
                  <span>{currentReview.date}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>{selectedClient.name} — {selectedClient.contact}</span>
                </div>
              </div>
              <Button size="sm" className="gap-2" onClick={() => setScheduleOpen(true)}>
                <CalendarDays className="w-3.5 h-3.5" />
                Schedule Review
              </Button>
            </div>

            {/* Objectives */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Review Objectives
              </p>
              <div className="space-y-2.5">
                {currentReview.objectives.map((obj, i) => (
                  <ObjectiveItem key={i} text={obj} index={i} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Past Reviews */}
      <motion.div custom={1} initial="hidden" animate="visible" variants={fadeIn}>
        <h2 className="text-lg font-display font-semibold text-foreground mb-3">Past Reviews</h2>
        <div className="space-y-4">
          {pastReviews.map((review) => (
            <div key={review.id} className="bg-card rounded-xl border border-border p-5 space-y-4">
              {/* Review header */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {review.quarter} {review.year} — {review.type}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{review.date}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 hover:bg-emerald-500/10 text-[10px]">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Complete
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-7 px-3"
                    onClick={() => setSelectedReview(review)}
                  >
                    View Summary
                  </Button>
                </div>
              </div>

              {/* Progress summary */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" /> Protection
                    </span>
                    <span className="font-semibold text-foreground">{review.protectionPct}%</span>
                  </div>
                  <Progress value={review.protectionPct} className="h-1.5" />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" /> Value Enhancement
                    </span>
                    <span className="font-semibold text-foreground">{review.valueEnhancementPct}%</span>
                  </div>
                  <Progress value={review.valueEnhancementPct} className="h-1.5" />
                </div>
              </div>

              {/* Findings */}
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                  Key Findings
                </p>
                <div className="space-y-1.5">
                  {review.findings.map((finding, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-foreground">
                      <FileText className="w-3 h-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                      {finding}
                    </div>
                  ))}
                </div>
              </div>

              {/* Milestones + Referrals */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                    Milestones Achieved
                  </p>
                  <div className="space-y-1.5">
                    {review.milestones.map((m, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                        <span className={cn("text-foreground")}>{m}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                    Referrals Made
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                      <span className="text-lg font-bold text-accent">{review.referrals}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">referral to partner network</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Dialogs */}
      <ScheduleDialog open={scheduleOpen} onClose={() => setScheduleOpen(false)} clientName={selectedClient.name} />
      <ReviewDetailDialog review={selectedReview} onClose={() => setSelectedReview(null)} clientName={selectedClient.name} clientContact={selectedClient.contact} />
    </div>
  );
};

export default QuarterlyReviewPage;
