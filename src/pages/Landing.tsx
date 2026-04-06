import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Shield, TrendingUp, Target, Users, BarChart3, Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  { icon: Shield, title: "Capital Architecture", desc: "Optimize entity structure, tax efficiency, and capital optionality. Complexity is not sophistication." },
  { icon: TrendingUp, title: "Customer Capital Defense", desc: "Evaluate revenue concentration, retention durability, and account transferability to protect enterprise value." },
  { icon: Target, title: "Performance & Execution", desc: "90-day sprints, KPI tracking, and board-style reporting to install disciplined execution." },
  { icon: Users, title: "Founder Independence", desc: "Systematically reduce founder dependency so the business runs — and sells — without you." },
  { icon: Landmark, title: "Value Multiplier Framework™", desc: "Enterprise Value = Earnings × Multiple. Most founders chase earnings. We amplify the drivers of the multiple." },
  { icon: BarChart3, title: "Investor Share", desc: "Curated, watermarked report sharing with expiring secure links for capital partners." },
];

const dimensions = [
  { label: "Clarity", value: "Capital follows clarity", quote: "Define value before pursuing scale." },
  { label: "Alignment", value: "Mutual verification", quote: "Trust begins where transparency is measured." },
  { label: "Structure", value: "Capital stack design", quote: "Complexity is not sophistication." },
  { label: "Stewardship", value: "Governance integrity", quote: "Capital is stewardship, not ownership." },
  { label: "Velocity", value: "Sustainable pace", quote: "Speed without clarity compounds risk." },
  { label: "Legacy", value: "Enduring beyond founder", quote: "Integrity compounded is the highest yield." },
];

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md gradient-gold flex items-center justify-center">
              <span className="text-sm font-bold text-accent-foreground font-display">F</span>
            </div>
            <span className="font-display text-lg font-semibold text-foreground tracking-tight">The Founders Office</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/client" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Client Portal</Link>
            <Link to="/login">
              <Button size="sm">Advisor Login</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent mb-4">Capital Alignment Platform</p>
          <h1 className="text-5xl md:text-6xl font-display font-semibold text-foreground leading-tight mb-6">
            Capital is not raised. It is designed.
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-2xl">
            The Founders Office helps advisors prepare founder-led businesses for stronger exits, smarter tax outcomes, reduced founder dependency, and real capital optionality — with structure, discipline, and institutional credibility.
          </p>
          <div className="flex gap-3">
            <Link to="/login">
              <Button size="lg" className="gap-2">
                Enter Advisor Dashboard <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link to="/founder">
              <Button variant="outline" size="lg">Founder Experience</Button>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Six Keys of Capital™ */}
      <section className="bg-card border-y border-border">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent mb-3">Six Keys of Capital™</p>
            <h2 className="text-3xl font-display font-semibold text-foreground">The discipline behind every capital decision</h2>
          </div>
          <div className="grid grid-cols-6 gap-4">
            {dimensions.map((d, i) => (
              <motion.div
                key={d.label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
                className="text-center p-5 rounded-lg border border-border bg-background"
              >
                <div className="w-10 h-10 rounded-full gradient-gold flex items-center justify-center mx-auto mb-3">
                  <span className="text-sm font-bold text-accent-foreground font-display">{d.label[0]}</span>
                </div>
                <p className="text-sm font-semibold text-foreground mb-0.5">{d.label}</p>
                <p className="text-xs text-muted-foreground">{d.value}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent mb-3">Core Engines</p>
          <h2 className="text-3xl font-display font-semibold text-foreground">Built for institutional advisory</h2>
        </div>
        <div className="grid grid-cols-3 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
              className="p-6 rounded-lg border border-border bg-card hover:shadow-card-hover transition-shadow"
            >
              <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center mb-4">
                <f.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-display font-semibold text-foreground mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-card border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-20 text-center">
          <h2 className="text-3xl font-display font-semibold text-foreground mb-4">
            When capital is aligned, both sides win.
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Structure. Discipline. Institutional Credibility. Capital alignment is not theory — it is leadership in motion.
          </p>
          <Link to="/login">
            <Button size="lg" className="gap-2">
              Get Started <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">&copy; 2026 The Founders Office. All rights reserved.</span>
          <span className="text-xs text-muted-foreground">Capital stewardship for founder-led ventures</span>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
