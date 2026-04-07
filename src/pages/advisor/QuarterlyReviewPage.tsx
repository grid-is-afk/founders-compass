import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useClientContext } from "@/hooks/useClientContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  CalendarDays,
  CheckCircle2,
  Users,
  TrendingUp,
  FileText,
  CalendarClock,
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
// Main page
// ---------------------------------------------------------------------------
const QuarterlyReviewPage = () => {
  const { selectedClientId, selectedClient } = useClientContext();

  // No client selected (empty database)
  if (!selectedClientId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-semibold text-foreground">Quarterly Reviews</h1>
          <p className="text-muted-foreground mt-1 text-sm">Structured engagement reviews</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-12 text-center">
          <CalendarClock className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-display text-lg font-semibold text-foreground mb-2">No quarterly reviews yet</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Create your first client and start their engagement journey to schedule reviews.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <h1 className="text-3xl font-display font-semibold text-foreground">Quarterly Reviews</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Structured engagement reviews — {selectedClient.name}
        </p>
      </motion.div>

      {/* Empty state — no reviews exist yet */}
      <motion.div custom={0} initial="hidden" animate="visible" variants={fadeIn}>
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <CalendarClock className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-display text-lg font-semibold text-foreground mb-2">No reviews scheduled yet</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Quarterly reviews will appear here once they are created for {selectedClient.name}. Use the schedule button to set up the first review.
          </p>
          <Button
            className="mt-6 gap-2"
            onClick={() =>
              toast("Create quarterly plans first", {
                description:
                  "Create quarterly plans for this client first (go to Journey page), then reviews can be scheduled.",
              })
            }
          >
            <CalendarDays className="w-4 h-4" />
            Schedule First Review
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default QuarterlyReviewPage;
