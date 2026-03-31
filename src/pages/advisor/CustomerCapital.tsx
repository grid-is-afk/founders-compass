import StatCard from "@/components/dashboard/StatCard";
import { TrendingUp, Shield, Users, AlertTriangle } from "lucide-react";

const concentrationData = [
  { customer: "Acme Corp", revenue: 32, risk: "High" },
  { customer: "GlobalTech", revenue: 18, risk: "Medium" },
  { customer: "Summit LLC", revenue: 14, risk: "Low" },
  { customer: "Pacific Industries", revenue: 12, risk: "Low" },
  { customer: "Other (18 clients)", revenue: 24, risk: "Low" },
];

const CustomerCapital = () => {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-semibold text-foreground">Customer Capital Defense</h1>
        <p className="text-muted-foreground mt-1 text-sm">Evaluate customer durability, revenue defensibility, and account transferability</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={TrendingUp} label="Customer Capital Index" value="68" suffix="/100" />
        <StatCard icon={Shield} label="Retention Durability" value="74" suffix="%" />
        <StatCard icon={Users} label="Account Transferability" value="52" suffix="/100" />
        <StatCard icon={AlertTriangle} label="Concentration Risk" value="High" />
      </div>

      <div>
        <h2 className="text-lg font-display font-semibold text-foreground mb-4">Revenue Concentration</h2>
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Customer</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Revenue %</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Concentration</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Risk</th>
              </tr>
            </thead>
            <tbody>
              {concentrationData.map((row) => (
                <tr key={row.customer} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 text-foreground font-medium">{row.customer}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.revenue}%</td>
                  <td className="px-4 py-3">
                    <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full gradient-olive" style={{ width: `${row.revenue * 3}%` }} />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      row.risk === "High" ? "bg-destructive/10 text-destructive" :
                      row.risk === "Medium" ? "bg-accent/15 text-accent-foreground" :
                      "bg-primary/10 text-primary"
                    }`}>
                      {row.risk}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CustomerCapital;
