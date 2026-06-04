import { useState, type FormEvent } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { roleHome } from "@/lib/roleLabels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Login mode tabs use Katie's nomenclature. The tabs are a UI affordance only — the
// actual portal a user lands in is driven by the role on their account, not the tab.
//   "Admin"   → TFO staff (advisor/admin slugs)
//   "Advisor" → licensees (licensee slug)
//   "Client"  → business owners (client slug)
type LoginMode = "admin" | "advisor" | "client";

const MODE_COPY: Record<LoginMode, { tab: string; heading: string; sub: string; placeholder: string }> = {
  admin: {
    tab: "Admin",
    heading: "Admin Sign In",
    sub: "Enter your credentials to access the back office.",
    placeholder: "you@foundersoffice.com",
  },
  advisor: {
    tab: "Advisor",
    heading: "Advisor Sign In",
    sub: "Enter your credentials to access your Founders Office portal.",
    placeholder: "you@yourfirm.com",
  },
  client: {
    tab: "Client",
    heading: "Client Sign In",
    sub: "Enter the credentials your advisor shared with you.",
    placeholder: "your@email.com",
  },
};

const Login = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, isLoading } = useAuth();

  const [loginMode, setLoginMode] = useState<LoginMode>("admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Already logged in — redirect based on role
  if (!isLoading && isAuthenticated) {
    const savedUser = localStorage.getItem("tfo-user");
    let role = "advisor";
    try { role = savedUser ? JSON.parse(savedUser).role : "advisor"; } catch { /* corrupted localStorage */ }
    return <Navigate to={roleHome(role)} replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await login(email.trim().toLowerCase(), password);
      // Redirect based on the authenticated user's role (not the selected tab)
      const savedUser = localStorage.getItem("tfo-user");
      let role = "advisor";
      try { role = savedUser ? JSON.parse(savedUser).role : "advisor"; } catch { /* corrupted localStorage */ }
      navigate(roleHome(role), { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  const copy = MODE_COPY[loginMode];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-col justify-between w-[420px] flex-shrink-0 bg-card border-r border-border p-10">
        <div>
          <div className="flex items-center gap-3 mb-12">
            <div className="w-9 h-9 rounded-md gradient-gold flex items-center justify-center">
              <span className="text-sm font-bold text-accent-foreground font-display">F</span>
            </div>
            <span className="font-display text-lg font-semibold text-foreground tracking-tight">
              The Founders Office
            </span>
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent mb-4">
            Capital Alignment Platform
          </p>
          <h2 className="text-3xl font-display font-semibold text-foreground leading-tight mb-6">
            Capital is not raised. It is designed.
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Prepare founder-led businesses for stronger exits, smarter tax
            outcomes, and real capital optionality — with structure, discipline,
            and institutional credibility.
          </p>
        </div>

        <div className="space-y-4">
          {[
            { label: "Clarity", quote: "Define value before pursuing scale." },
            { label: "Structure", quote: "Complexity is not sophistication." },
            { label: "Stewardship", quote: "Integrity compounded is the highest yield." },
          ].map((d) => (
            <div key={d.label} className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full gradient-olive flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-[10px] font-bold text-primary-foreground">
                  {d.label[0]}
                </span>
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">{d.label}</p>
                <p className="text-xs text-muted-foreground">{d.quote}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          &copy; 2026 The Founders Office. All rights reserved.
        </p>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="w-full max-w-sm"
        >
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-md gradient-gold flex items-center justify-center">
              <span className="text-sm font-bold text-accent-foreground font-display">F</span>
            </div>
            <span className="font-display text-lg font-semibold text-foreground">
              The Founders Office
            </span>
          </div>

          {/* Login mode tabs */}
          <div className="flex rounded-lg border border-border bg-muted/30 p-1 mb-8">
            {(Object.keys(MODE_COPY) as LoginMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => { setLoginMode(mode); setError(null); }}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  loginMode === mode
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {MODE_COPY[mode].tab}
              </button>
            ))}
          </div>

          <h1 className="text-2xl font-display font-semibold text-foreground mb-1">
            {copy.heading}
          </h1>
          <p className="text-sm text-muted-foreground mb-8">
            {copy.sub}
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  placeholder={copy.placeholder}
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 pr-9"
                  placeholder="••••••••"
                  disabled={submitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2"
              >
                <p className="text-xs text-destructive font-medium">{error}</p>
              </motion.div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={submitting || !email || !password}
            >
              {submitting ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
