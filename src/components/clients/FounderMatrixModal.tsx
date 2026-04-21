import { useState, useCallback } from "react";
import { Layers } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSubmitClientFounderMatrix } from "@/hooks/useClientFounderMatrix";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Intake section definitions
// ---------------------------------------------------------------------------

interface IntakeField {
  key: string;
  label: string;
  type: "text" | "select" | "boolean";
  options?: string[];
  placeholder?: string;
}

interface IntakeSection {
  id: string;
  title: string;
  fields: IntakeField[];
}

function buildCorpSections(): IntakeSection[] {
  return [
    {
      id: "general",
      title: "General Information",
      fields: [
        { key: "corp_name", label: "Corporation Name", type: "text", placeholder: "e.g. Acme Corp Inc." },
        { key: "state", label: "State of Incorporation", type: "text", placeholder: "e.g. Delaware" },
        { key: "date_incorporated", label: "Date Incorporated", type: "text", placeholder: "MM/YYYY" },
        { key: "registered_agent", label: "Registered Agent", type: "text", placeholder: "Name or company" },
      ],
    },
    {
      id: "ownership",
      title: "Ownership & Shareholders",
      fields: [
        { key: "shareholder_1_name", label: "Shareholder 1 Name", type: "text", placeholder: "Full name" },
        { key: "shareholder_1_pct", label: "Shareholder 1 %", type: "text", placeholder: "e.g. 60%" },
        { key: "shareholder_2_name", label: "Shareholder 2 Name", type: "text", placeholder: "Full name" },
        { key: "shareholder_2_pct", label: "Shareholder 2 %", type: "text", placeholder: "e.g. 40%" },
        { key: "shareholder_3_name", label: "Shareholder 3 Name", type: "text", placeholder: "Full name" },
        { key: "shareholder_3_pct", label: "Shareholder 3 %", type: "text", placeholder: "e.g. 0%" },
        { key: "shareholder_4_name", label: "Shareholder 4 Name", type: "text", placeholder: "Full name" },
        { key: "shareholder_4_pct", label: "Shareholder 4 %", type: "text", placeholder: "e.g. 0%" },
      ],
    },
    {
      id: "compliance",
      title: "Corporate Structure & Compliance",
      fields: [
        { key: "bylaws_exist", label: "Bylaws exist?", type: "boolean" },
        { key: "corporate_formalities", label: "Corporate formalities observed?", type: "boolean" },
        { key: "annual_reports_filed", label: "Annual reports filed?", type: "boolean" },
        { key: "board_meetings_held", label: "Board meetings held?", type: "boolean" },
      ],
    },
    {
      id: "officers",
      title: "Corporate Officers & Directors",
      fields: [
        { key: "president", label: "President", type: "text", placeholder: "Full name" },
        { key: "vp", label: "Vice President", type: "text", placeholder: "Full name" },
        { key: "secretary", label: "Secretary", type: "text", placeholder: "Full name" },
        { key: "treasurer", label: "Treasurer", type: "text", placeholder: "Full name" },
        { key: "director_1", label: "Director 1", type: "text", placeholder: "Full name" },
        { key: "director_2", label: "Director 2", type: "text", placeholder: "Full name" },
        { key: "director_3", label: "Director 3", type: "text", placeholder: "Full name" },
      ],
    },
    {
      id: "financial",
      title: "Financial",
      fields: [
        { key: "bank_account_exists", label: "Dedicated bank account?", type: "boolean" },
        { key: "bank_institution", label: "Bank institution name", type: "text", placeholder: "e.g. Chase" },
        { key: "exclusive_business_use", label: "Account for exclusive business use?", type: "boolean" },
      ],
    },
    {
      id: "insurance",
      title: "Insurance",
      fields: [
        { key: "insurance_coverage", label: "Coverage exists?", type: "boolean" },
        { key: "insurance_types", label: "Types of coverage", type: "text", placeholder: "e.g. GL, D&O, E&O" },
      ],
    },
    {
      id: "business_activities",
      title: "Business Activities",
      fields: [
        { key: "multi_state", label: "Operations in multiple states?", type: "boolean" },
        { key: "employee_count", label: "Employee count", type: "text", placeholder: "e.g. 12" },
        { key: "contractor_count", label: "Contractor count", type: "text", placeholder: "e.g. 5" },
      ],
    },
    {
      id: "tax",
      title: "Tax",
      fields: [
        { key: "ein", label: "EIN", type: "text", placeholder: "XX-XXXXXXX" },
        { key: "s_corp_election", label: "S-Corp election filed?", type: "boolean" },
        { key: "tax_classification", label: "Tax classification", type: "text", placeholder: "e.g. S-Corp, C-Corp" },
        { key: "tax_preparer", label: "Tax preparer name", type: "text", placeholder: "Name or firm" },
        { key: "sales_tax_applicable", label: "Sales tax applicable?", type: "boolean" },
      ],
    },
    {
      id: "licenses",
      title: "Business Licenses",
      fields: [
        { key: "licenses_required", label: "Licenses required?", type: "boolean" },
        { key: "license_list", label: "License list", type: "text", placeholder: "Comma-separated" },
      ],
    },
    {
      id: "ip",
      title: "Intellectual Property",
      fields: [
        { key: "trademarks_patents", label: "Trademarks / patents?", type: "boolean" },
        { key: "ip_details", label: "IP details", type: "text", placeholder: "Description" },
      ],
    },
    {
      id: "succession",
      title: "Succession Planning",
      fields: [
        { key: "succession_plan", label: "Succession plan exists?", type: "boolean" },
        { key: "exit_strategy", label: "Exit strategy defined?", type: "boolean" },
      ],
    },
    {
      id: "notes",
      title: "Additional Notes",
      fields: [
        { key: "additional_notes", label: "Notes", type: "text", placeholder: "Any additional context..." },
      ],
    },
  ];
}

function buildLLCSections(): IntakeSection[] {
  return [
    {
      id: "general",
      title: "General Information",
      fields: [
        { key: "llc_name", label: "LLC Name", type: "text", placeholder: "e.g. Acme LLC" },
        { key: "state", label: "State of Formation", type: "text", placeholder: "e.g. Delaware" },
        { key: "date_formed", label: "Date Formed", type: "text", placeholder: "MM/YYYY" },
        { key: "registered_agent", label: "Registered Agent", type: "text", placeholder: "Name or company" },
      ],
    },
    {
      id: "ownership",
      title: "Members & Ownership",
      fields: [
        { key: "member_1_name", label: "Member 1 Name", type: "text", placeholder: "Full name" },
        { key: "member_1_pct", label: "Member 1 %", type: "text", placeholder: "e.g. 60%" },
        { key: "member_2_name", label: "Member 2 Name", type: "text", placeholder: "Full name" },
        { key: "member_2_pct", label: "Member 2 %", type: "text", placeholder: "e.g. 40%" },
        { key: "member_3_name", label: "Member 3 Name", type: "text", placeholder: "Full name" },
        { key: "member_3_pct", label: "Member 3 %", type: "text", placeholder: "e.g. 0%" },
        { key: "member_4_name", label: "Member 4 Name", type: "text", placeholder: "Full name" },
        { key: "member_4_pct", label: "Member 4 %", type: "text", placeholder: "e.g. 0%" },
      ],
    },
    {
      id: "compliance",
      title: "Operating Agreement & Compliance",
      fields: [
        { key: "operating_agreement_exists", label: "Operating agreement exists?", type: "boolean" },
        { key: "corporate_formalities", label: "Corporate formalities observed?", type: "boolean" },
        { key: "annual_reports_filed", label: "Annual reports filed?", type: "boolean" },
        { key: "member_meetings_held", label: "Member meetings held?", type: "boolean" },
      ],
    },
    {
      id: "management",
      title: "Managers",
      fields: [
        { key: "manager_1", label: "Manager 1", type: "text", placeholder: "Full name" },
        { key: "manager_2", label: "Manager 2", type: "text", placeholder: "Full name" },
        { key: "manager_3", label: "Manager 3", type: "text", placeholder: "Full name" },
      ],
    },
    {
      id: "financial",
      title: "Financial",
      fields: [
        { key: "bank_account_exists", label: "Dedicated bank account?", type: "boolean" },
        { key: "bank_institution", label: "Bank institution name", type: "text", placeholder: "e.g. Chase" },
        { key: "exclusive_business_use", label: "Account for exclusive business use?", type: "boolean" },
      ],
    },
    {
      id: "insurance",
      title: "Insurance",
      fields: [
        { key: "insurance_coverage", label: "Coverage exists?", type: "boolean" },
        { key: "insurance_types", label: "Types of coverage", type: "text", placeholder: "e.g. GL, E&O" },
      ],
    },
    {
      id: "business_activities",
      title: "Business Activities",
      fields: [
        { key: "multi_state", label: "Operations in multiple states?", type: "boolean" },
        { key: "employee_count", label: "Employee count", type: "text", placeholder: "e.g. 12" },
        { key: "contractor_count", label: "Contractor count", type: "text", placeholder: "e.g. 5" },
      ],
    },
    {
      id: "tax",
      title: "Tax",
      fields: [
        { key: "ein", label: "EIN", type: "text", placeholder: "XX-XXXXXXX" },
        { key: "tax_classification", label: "Tax classification", type: "text", placeholder: "e.g. Partnership, S-Corp" },
        { key: "tax_preparer", label: "Tax preparer name", type: "text", placeholder: "Name or firm" },
        { key: "sales_tax_applicable", label: "Sales tax applicable?", type: "boolean" },
      ],
    },
    {
      id: "licenses",
      title: "Business Licenses",
      fields: [
        { key: "licenses_required", label: "Licenses required?", type: "boolean" },
        { key: "license_list", label: "License list", type: "text", placeholder: "Comma-separated" },
      ],
    },
    {
      id: "ip",
      title: "Intellectual Property",
      fields: [
        { key: "trademarks_patents", label: "Trademarks / patents?", type: "boolean" },
        { key: "ip_details", label: "IP details", type: "text", placeholder: "Description" },
      ],
    },
    {
      id: "succession",
      title: "Succession Planning",
      fields: [
        { key: "succession_plan", label: "Succession plan exists?", type: "boolean" },
        { key: "exit_strategy", label: "Exit strategy defined?", type: "boolean" },
      ],
    },
    {
      id: "notes",
      title: "Additional Notes",
      fields: [
        { key: "additional_notes", label: "Notes", type: "text", placeholder: "Any additional context..." },
      ],
    },
  ];
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface FounderMatrixModalProps {
  open: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
  entityType: "corp" | "llc";
  existingResponses?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FounderMatrixModal({
  open,
  onClose,
  clientId,
  clientName,
  entityType,
  existingResponses,
}: FounderMatrixModalProps) {
  const [responses, setResponses] = useState<Record<string, unknown>>(
    existingResponses ?? {}
  );

  const submitMutation = useSubmitClientFounderMatrix(clientId);

  const sections = entityType === "corp" ? buildCorpSections() : buildLLCSections();

  const handleChange = useCallback((key: string, value: unknown) => {
    setResponses((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSubmit = async () => {
    // FIX-7: Require at least the company name before saving to prevent a blank submission.
    const primaryName = entityType === "corp"
      ? (responses.corp_name as string | undefined)
      : (responses.llc_name as string | undefined);
    if (!primaryName?.trim()) {
      toast.error("Please enter at least the company name before saving.");
      return;
    }
    try {
      await submitMutation.mutateAsync({ entity_type: entityType, responses });
      toast.success("Founder Matrix saved", {
        description: `${entityType.toUpperCase()} intake completed for ${clientName}.`,
      });
      onClose();
    } catch {
      toast.error("Failed to save Founder Matrix. Please try again.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !submitMutation.isPending) onClose(); }}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0">
        {/* Sticky header */}
        <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-border">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-violet-500/10 flex items-center justify-center">
                <Layers className="w-3.5 h-3.5 text-violet-600" />
              </div>
              <div>
                <DialogTitle className="font-display text-base">Founder Matrix™</DialogTitle>
                <DialogDescription className="text-xs mt-0.5">
                  {clientName} — {entityType === "corp" ? "Corporation" : "LLC"} Intake
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-7">
          {sections.map((section) => (
            <section key={section.id} className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground border-b border-border/60 pb-1.5">
                {section.title}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {section.fields.map((field) => {
                  const value = responses[field.key];
                  return (
                    <div key={field.key} className="space-y-1">
                      <label className="text-xs font-medium text-foreground">
                        {field.label}
                      </label>
                      {field.type === "boolean" ? (
                        <div className="flex gap-2">
                          {["Yes", "No"].map((opt) => {
                            const boolVal = opt === "Yes";
                            const isSelected = value === boolVal;
                            return (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => handleChange(field.key, boolVal)}
                                className={cn(
                                  "flex-1 rounded-md border px-3 py-2 text-xs font-medium transition-colors",
                                  isSelected
                                    ? "border-primary bg-primary/10 text-primary"
                                    : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                                )}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <input
                          type="text"
                          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                          placeholder={field.placeholder ?? ""}
                          value={typeof value === "string" ? value : ""}
                          onChange={(e) => handleChange(field.key, e.target.value)}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        {/* Sticky footer */}
        <DialogFooter className="flex-shrink-0 px-6 py-4 border-t border-border flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">
            Fields are optional — save anytime to preserve progress.
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={submitMutation.isPending}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitMutation.isPending}>
              {submitMutation.isPending ? "Saving..." : "Save Intake"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
