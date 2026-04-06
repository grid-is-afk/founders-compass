import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useClientContext } from "@/hooks/useClientContext";
import { useClientRiskAlerts } from "@/hooks/useRiskAlerts";
import { useClientDeliverables } from "@/hooks/useDeliverables";
import PriorityActionsTab from "./copilot/PriorityActionsTab";
import RiskAlertsTab from "./copilot/RiskAlertsTab";
import DataGapsTab from "./copilot/DataGapsTab";
import DeliverablesTab from "./copilot/DeliverablesTab";
import InsuranceTab from "./copilot/InsuranceTab";

// Static advisor-wide counts — no DB tables yet for these
const PRIORITY_ACTIONS_COUNT = 5;
const DATA_GAPS_COUNT = 4;
const INSURANCE_COUNT = 5;

const IntelligencePanel = () => {
  const { selectedClientId } = useClientContext();
  const { data: rawAlerts = [] } = useClientRiskAlerts(selectedClientId);
  const { data: rawDeliverables = [] } = useClientDeliverables(selectedClientId);

  const criticalCount = (rawAlerts as Array<{ severity: string }>).filter((r) => r.severity === "critical").length;
  const deliverablesCount = (rawDeliverables as unknown[]).length;

  return (
    <div className="bg-card rounded-lg border border-border p-5">
      <Tabs defaultValue="actions">
        <TabsList className="mb-4">
          <TabsTrigger value="actions" className="flex items-center gap-1.5">
            Priority Actions
            <Badge variant="secondary" className="text-[10px] ml-1">
              {PRIORITY_ACTIONS_COUNT}
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
              {DATA_GAPS_COUNT}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="deliverables" className="flex items-center gap-1.5">
            Deliverables
            {deliverablesCount > 0 && (
              <Badge variant="secondary" className="text-[10px] ml-1">
                {deliverablesCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="insurance" className="flex items-center gap-1.5">
            Insurance
            <Badge variant="secondary" className="text-[10px] ml-1">
              {INSURANCE_COUNT}
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
