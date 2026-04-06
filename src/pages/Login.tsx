import { useState, type FormEvent } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const Login = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, isLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Already logged in — redirect based on role
  if (!isLoading && isAuthenticated) {
    const savedUser = localStorage.getItem("tfo-user");
    const role = savedUser ? JSON.parse(savedUser).role : "advisor";
    return <Navigate to={role === "client" ? "/client" : "/advisor"} replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await login(email.trim().toLowerCase(), password);
      // Redirect based on role
      const savedUser = localStorage.getItem("tfo-user");
      const role = savedUser ? JSON.parse(savedUser).role : "advisor";
      navigate(role === "client" ? "/client" : "/advisor", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

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

          <h1 className="text-2xl font-display font-semibold text-foreground mb-1">
            Advisor Sign In
          </h1>
          <p className="text-sm text-muted-foreground mb-8">
            Enter your credentials to access the back office.
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
                  placeholder="you@foundersoffice.com"
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
