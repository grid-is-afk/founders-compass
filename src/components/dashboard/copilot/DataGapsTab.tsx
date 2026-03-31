import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { copilotDataGaps } from "@/lib/mockData";

const DataGapsTab = () => {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border">
          <th className="text-left py-2 text-xs font-medium text-muted-foreground">Missing Data</th>
          <th className="text-left py-2 text-xs font-medium text-muted-foreground">Client</th>
          <th className="text-left py-2 text-xs font-medium text-muted-foreground">Impact</th>
          <th className="py-2"></th>
        </tr>
      </thead>
      <tbody>
        {copilotDataGaps.map((gap) => (
          <tr key={gap.id} className="border-b border-border/50 last:border-0">
            <td className="py-2.5">
              <p className="font-medium text-foreground">{gap.gap}</p>
              <p className="text-[10px] text-muted-foreground">{gap.category}</p>
            </td>
            <td className="py-2.5 text-muted-foreground">{gap.client}</td>
            <td className="py-2.5 text-xs text-destructive/80">{gap.impact}</td>
            <td className="py-2.5">
              <Button variant="outline" size="sm" className="text-xs h-7">
                <Upload className="w-3 h-3 mr-1" />Request
              </Button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default DataGapsTab;
