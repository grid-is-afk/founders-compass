import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { copilotPriorityActions, copilotDataGaps, copilotRiskAlerts, insuranceOpportunities } from "@/lib/mockData";
import PriorityActionsTab from "./copilot/PriorityActionsTab";
import RiskAlertsTab from "./copilot/RiskAlertsTab";
import DataGapsTab from "./copilot/DataGapsTab";
import DeliverablesTab from "./copilot/DeliverablesTab";
import InsuranceTab from "./copilot/InsuranceTab";

const IntelligencePanel = () => {
  const criticalCount = copilotRiskAlerts.filter((r) => r.severity === "critical").length;

  return (
    <div className="bg-card rounded-lg border border-border p-5">
      <Tabs defaultValue="actions">
        <TabsList className="mb-4">
          <TabsTrigger value="actions" className="flex items-center gap-1.5">
            Priority Actions
            <Badge variant="secondary" className="text-[10px] ml-1">
              {copilotPriorityActions.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="risks" className="flex items-center gap-1.5">
            Risk Alerts
            {criticalCount > 0 && (
              <Badge variant="destructive" className="text-[10px] ml-1">
                {criticalCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="gaps" className="flex items-center gap-1.5">
            Data Gaps
            <Badge variant="secondary" className="text-[10px] ml-1">
              {copilotDataGaps.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="deliverables">Deliverables</TabsTrigger>
          <TabsTrigger value="insurance" className="flex items-center gap-1.5">
            Insurance
            <Badge variant="secondary" className="text-[10px] ml-1">
              {insuranceOpportunities.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="actions">
          <div className="max-h-[400px] overflow-y-auto">
            <PriorityActionsTab />
          </div>
        </TabsContent>

        <TabsContent value="risks">
          <div className="max-h-[400px] overflow-y-auto">
            <RiskAlertsTab />
          </div>
        </TabsContent>

        <TabsContent value="gaps">
          <div className="max-h-[400px] overflow-y-auto">
            <DataGapsTab />
          </div>
        </TabsContent>

        <TabsContent value="deliverables">
          <div className="max-h-[400px] overflow-y-auto">
            <DeliverablesTab />
          </div>
        </TabsContent>

        <TabsContent value="insurance">
          <div className="max-h-[400px] overflow-y-auto">
            <InsuranceTab />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default IntelligencePanel;
