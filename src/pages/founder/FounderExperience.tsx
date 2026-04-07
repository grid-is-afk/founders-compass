import { motion } from "framer-motion";
import { Shield, TrendingUp, Target, FileText, ArrowLeft, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const FounderExperience = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md gradient-gold flex items-center justify-center">
              <span className="text-sm font-bold text-accent-foreground font-display">F</span>
            </div>
            <span className="font-display text-lg font-semibold text-foreground">The Founders Office</span>
          </div>
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
              <ArrowLeft className="w-3 h-3" /> Back
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12 space-y-10">
        {/* Welcome */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent mb-2">Founder Experience</p>
          <h1 className="text-4xl font-display font-semibold text-foreground mb-2">Your Engagement Portal</h1>
          <p className="text-muted-foreground text-sm">Your personalized view of the TFO engagement — metrics, milestones, and deliverables in one place.</p>
        </motion.div>

        {/* Key Metrics placeholder */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: TrendingUp, label: "Capital Readiness" },
            { icon: Shield, label: "Customer Capital Index" },
            { icon: Target, label: "Sprint Progress" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
              className="bg-card rounded-lg border border-border p-5"
            >
              <div className="flex items-center gap-2 mb-3">
                <stat.icon className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
              <div className="h-7 w-20 rounded bg-muted/60 animate-pulse" />
            </motion.div>
          ))}
        </div>

        {/* Six Keys placeholder */}
        <div>
          <h2 className="text-lg font-display font-semibold text-foreground mb-4">Six Keys of Capital™</h2>
          <div className="grid grid-cols-6 gap-3">
            {["Clarity", "Alignment", "Structure", "Stewardship", "Velocity", "Legacy"].map((label, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.06, duration: 0.4 }}
                className="bg-card rounded-lg border border-border p-4 text-center"
              >
                <div className="w-9 h-9 rounded-full gradient-gold flex items-center justify-center mx-auto mb-2">
                  <span className="text-xs font-bold text-accent-foreground font-display">{label[0]}</span>
                </div>
                <p className="text-xs font-medium text-foreground mb-1">{label}</p>
                <div className="h-5 w-8 rounded bg-muted/60 animate-pulse mx-auto" />
              </motion.div>
            ))}
          </div>
        </div>

        {/* Two columns: Milestones + Reports */}
        <div className="grid grid-cols-2 gap-6">
          {/* Milestones */}
          <div>
            <h2 className="text-lg font-display font-semibold text-foreground mb-4">Engagement Milestones</h2>
            <div className="bg-card rounded-lg border border-border p-8 text-center">
              <Target className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground mb-1">No milestones yet</p>
              <p className="text-xs text-muted-foreground">Milestones will appear as your engagement progresses.</p>
            </div>
          </div>

          {/* Published Reports */}
          <div>
            <h2 className="text-lg font-display font-semibold text-foreground mb-4">Published Reports</h2>
            <div className="bg-card rounded-lg border border-border p-8 text-center">
              <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground mb-1">No reports published yet</p>
              <p className="text-xs text-muted-foreground">Your advisor will publish reports as instruments are completed.</p>
            </div>
          </div>
        </div>

        {/* Portal access callout */}
        <div className="bg-card rounded-lg border border-border p-6 flex items-start gap-4">
          <Lock className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-display font-semibold text-foreground mb-1">Your Secure Portal</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              This is your dedicated view of the TFO engagement. Your advisor manages your data, tracks milestones, and publishes insights here. Contact your advisor to get started.
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t border-border py-6 mt-12">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <span className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} The Founders Office. Capital stewardship for founder-led ventures.</span>
        </div>
      </footer>
    </div>
  );
};

export default FounderExperience;
