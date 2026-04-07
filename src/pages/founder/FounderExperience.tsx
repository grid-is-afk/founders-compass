import { motion } from "framer-motion";
import { Shield, TrendingUp, Target, CheckCircle2, Clock, Circle, FileText, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const sixKeys = [
  { label: "Clarity", score: 78 },
  { label: "Alignment", score: 65 },
  { label: "Structure", score: 82 },
  { label: "Stewardship", score: 71 },
  { label: "Velocity", score: 59 },
  { label: "Legacy", score: 74 },
];

const milestones = [
  { title: "Financial statement analysis", status: "done" as const },
  { title: "Entity structure review", status: "done" as const },
  { title: "Customer concentration assessment", status: "in_progress" as const },
  { title: "Capital optionality modeling", status: "in_progress" as const },
  { title: "90-Day execution sprint launch", status: "todo" as const },
  { title: "Board-style monthly reporting", status: "todo" as const },
];

const reports = [
  { title: "Capital Readiness Memo", date: "Mar 5, 2026", pages: 12 },
  { title: "Institutional Performance Brief", date: "Feb 28, 2026", pages: 8 },
  { title: "Customer Defensibility Summary", date: "Feb 20, 2026", pages: 6 },
];

const statusIcon = {
  done: <CheckCircle2 className="w-4 h-4 text-primary" />,
  in_progress: <Clock className="w-4 h-4 text-accent" />,
  todo: <Circle className="w-4 h-4 text-muted-foreground" />,
};

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
          <h1 className="text-4xl font-display font-semibold text-foreground mb-2">Your Company</h1>
          <p className="text-muted-foreground text-sm">Your engagement overview — Q2 2026 — Protect &amp; Grow</p>
        </motion.div>

        {/* Key Metrics */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: TrendingUp, label: "Capital Readiness", value: "72", suffix: "/100" },
            { icon: Shield, label: "Customer Capital Index", value: "68", suffix: "/100" },
            { icon: Target, label: "Sprint Progress", value: "64", suffix: "%" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
              className="bg-card rounded-lg border border-border p-5"
            >
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
              <p className="text-2xl font-display font-semibold text-foreground">
                {stat.value}<span className="text-sm text-muted-foreground font-normal">{stat.suffix}</span>
              </p>
            </motion.div>
          ))}
        </div>

        {/* Six Keys of Capital™ */}
        <div>
          <h2 className="text-lg font-display font-semibold text-foreground mb-4">Six Keys of Capital™</h2>
          <div className="grid grid-cols-6 gap-3">
            {sixKeys.map((key, i) => (
              <motion.div
                key={key.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.06, duration: 0.4 }}
                className="bg-card rounded-lg border border-border p-4 text-center"
              >
                <div className="w-9 h-9 rounded-full gradient-gold flex items-center justify-center mx-auto mb-2">
                  <span className="text-xs font-bold text-accent-foreground font-display">{key.label[0]}</span>
                </div>
                <p className="text-xs font-medium text-foreground mb-1">{key.label}</p>
                <p className="text-lg font-display font-semibold text-foreground">{key.score}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Two columns: Milestones + Reports */}
        <div className="grid grid-cols-2 gap-6">
          {/* Milestones */}
          <div>
            <h2 className="text-lg font-display font-semibold text-foreground mb-4">Engagement Milestones</h2>
            <div className="bg-card rounded-lg border border-border divide-y divide-border">
              {milestones.map((m) => (
                <div key={m.title} className="flex items-center gap-3 px-5 py-4">
                  {statusIcon[m.status]}
                  <p className={cn(
                    "text-sm flex-1",
                    m.status === "done" && "text-muted-foreground line-through"
                  )}>{m.title}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Published Reports */}
          <div>
            <h2 className="text-lg font-display font-semibold text-foreground mb-4">Published Reports</h2>
            <div className="space-y-3">
              {reports.map((r) => (
                <div key={r.title} className="bg-card rounded-lg border border-border p-4 flex items-center gap-4">
                  <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{r.title}</p>
                    <p className="text-xs text-muted-foreground">{r.date} · {r.pages} pages</p>
                  </div>
                  <span className="text-xs text-primary cursor-pointer hover:underline">View</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Next steps callout */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h3 className="font-display font-semibold text-foreground mb-2">What's Next</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your advisor is completing the customer concentration assessment and will publish the Capital Optionality Analysis by end of month. Your next task: upload 3 years of tax returns to the secure data room.
          </p>
        </div>
      </main>

      <footer className="border-t border-border py-6 mt-12">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <span className="text-xs text-muted-foreground">&copy; 2026 The Founders Office. Capital stewardship for founder-led ventures.</span>
        </div>
      </footer>
    </div>
  );
};

export default FounderExperience;
