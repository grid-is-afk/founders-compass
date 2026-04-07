import { Search } from "lucide-react";

const DataGapsTab = () => {
  return (
    <div className="bg-card rounded-lg border border-border p-8 text-center">
      <Search className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
      <h3 className="font-display font-semibold text-foreground mb-1">No data gaps detected</h3>
      <p className="text-sm text-muted-foreground">Data gaps will appear here once clients and their documents are added.</p>
    </div>
  );
};

export default DataGapsTab;
