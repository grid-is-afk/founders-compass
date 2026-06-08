import { useNavigate } from "react-router-dom";
import { Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * The licensee Quarterback AI is read-only and scoped to one client at a time,
 * so it lives as a floating panel on each client's dashboard — not as a global
 * page. This screen just points the advisor there.
 */
const LicenseeQuarterbackInfo = () => {
  const navigate = useNavigate();
  return (
    <div className="max-w-2xl">
      <div className="flex flex-col items-center justify-center text-center rounded-xl border border-dashed border-border bg-card py-20 px-8">
        <div className="w-12 h-12 rounded-lg gradient-gold flex items-center justify-center mb-4">
          <Sparkles className="w-6 h-6 text-accent-foreground" />
        </div>
        <h1 className="text-xl font-display font-semibold text-foreground mb-2">Quarterback AI</h1>
        <p className="text-sm text-muted-foreground max-w-md mb-6">
          Open any client and use the <span className="font-medium text-foreground">Quarterback</span> button
          in the corner to ask about that client's readiness scores, flagged gaps, and what to prioritize.
          It's read-only and only ever sees the client you're viewing.
        </p>
        <Button onClick={() => navigate("/licensee/clients")} className="gap-2">
          Go to clients <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default LicenseeQuarterbackInfo;
