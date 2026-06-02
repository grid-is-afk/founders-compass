import { motion } from "framer-motion";
import { useClientContext } from "@/hooks/useClientContext";
import { CalendarClock } from "lucide-react";

// ---------------------------------------------------------------------------
// Main page
//
// Quarterly objectives are managed on the client dashboard (the Objectives card
// next to Quarter Progress). This route is a lightweight placeholder retained
// for the command palette; it points advisors to the dashboard.
// ---------------------------------------------------------------------------
const QuarterlyReviewPage = () => {
  const { selectedClientId, selectedClient } = useClientContext();

  const description = selectedClientId
    ? `Quarterly objectives for ${selectedClient.name} are managed on the client dashboard — see the Objectives card beside Quarter Progress.`
    : "Create your first client and start their engagement journey to manage quarterly reviews.";

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <h1 className="text-3xl font-display font-semibold text-foreground">Quarterly Reviews</h1>
        <p className="text-muted-foreground mt-1 text-sm">Structured engagement reviews</p>
      </motion.div>

      <div className="bg-card rounded-lg border border-border p-12 text-center">
        <CalendarClock className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
        <h3 className="font-display text-lg font-semibold text-foreground mb-2">
          Managed on the client dashboard
        </h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">{description}</p>
      </div>
    </div>
  );
};

export default QuarterlyReviewPage;
