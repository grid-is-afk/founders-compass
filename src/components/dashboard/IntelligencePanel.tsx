import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useClientContext } from "@/hooks/useClientContext";
import { useClientRiskAlerts } from "@/hooks/useRiskAlerts";
import { useClientDeliverables } from "@/hooks/useDeliverables";
import { usePriorityActions, useDataGaps, useDashboardInsurance } from "@/hooks/useDashboardIntelligence";
import PriorityActionsTab from "./copilot/PriorityActionsTab";
import RiskAlertsTab from "./copilot/RiskAlertsTab";
import DataGapsTab from "./copilot/DataGapsTab";
import DeliverablesTab from "./copilot/DeliverablesTab";
import InsuranceTab from "./copilot/InsuranceTab";

const IntelligencePanel = ({ clientId }: { clientId?: string }) => {
  const { selectedClientId } = useClientContext();
  const effectiveClientId = clientId ?? selectedClientId;
  const { data: rawAlerts = [] } = useClientRiskAlerts(effectiveClientId);
  const { data: rawDeliverables = [] } = useClientDeliverables(effectiveClientId);
  const { data: priorityActions = [] } = usePriorityActions(clientId);
  const { data: dataGaps = [] } = useDataGaps(clientId);
  const { data: insuranceItems = [] } = useDashboardInsurance(clientId);

  const criticalCount = (rawAlerts as Array<{ severity: string }>).filter((r) => r.severity === "critical").length;
  const deliverablesCount = (rawDeliverables as unknown[]).length;

  return (
    <div className="bg-card rounded-lg border border-border p-5">
      <Tabs defaultValue="actions">
        <TabsList className="mb-4">
          <TabsTrigger value="actions" className="flex items-center gap-1.5">
            Priority Actions
            {priorityActions.length > 0 && (
              <Badge variant="secondary" className="text-[10px] ml-1">
                {priorityActions.length}
              </Badge>
            )}
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
            {dataGaps.length > 0 && (
              <Badge variant="secondary" className="text-[10px] ml-1">
                {dataGaps.length}
              </Badge>
            )}
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
            {insuranceItems.length > 0 && (
              <Badge variant="secondary" className="text-[10px] ml-1">
                {insuranceItems.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="actions">
          <div className="max-h-[400px] overflow-y-auto">
            <PriorityActionsTab clientId={clientId} />
          </div>
        </TabsContent>

        <TabsContent value="risks">
          <div className="max-h-[400px] overflow-y-auto">
            <RiskAlertsTab />
          </div>
        </TabsContent>

        <TabsContent value="gaps">
          <div className="max-h-[400px] overflow-y-auto">
            <DataGapsTab clientId={clientId} />
          </div>
        </TabsContent>

        <TabsContent value="deliverables">
          <div className="max-h-[400px] overflow-y-auto">
            <DeliverablesTab />
          </div>
        </TabsContent>

        <TabsContent value="insurance">
          <div className="max-h-[400px] overflow-y-auto">
            <InsuranceTab clientId={clientId} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default IntelligencePanel;
