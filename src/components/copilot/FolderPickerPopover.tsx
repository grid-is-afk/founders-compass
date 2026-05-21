import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const FOLDERS = [
  "Reports",
  "Meeting Notes",
  "Financials",
  "Governance",
  "Customer Capital",
  "Legal & Structure",
  "Agreements",
  "Project Management",
  "Liability",
  "Other",
] as const;

type Folder = (typeof FOLDERS)[number];

interface FolderPickerPopoverProps {
  children: React.ReactNode;
  defaultFolder?: Folder;
  onConfirm: (folder: Folder) => void;
}

export function FolderPickerPopover({
  children,
  defaultFolder = "Reports",
  onConfirm,
}: FolderPickerPopoverProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Folder>(defaultFolder);

  function handleConfirm() {
    setOpen(false);
    onConfirm(selected);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-72 p-4 space-y-3" align="end" sideOffset={8}>
        <div>
          <p className="text-xs font-semibold text-foreground mb-0.5">Save to Data Room folder:</p>
          <p className="text-[11px] text-muted-foreground">Choose where this report will be saved.</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FOLDERS.map((folder) => (
            <button
              key={folder}
              onClick={() => setSelected(folder)}
              className={cn(
                "text-[11px] font-medium px-2.5 py-1 rounded-full border transition-colors",
                selected === folder
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:bg-muted/50 hover:text-foreground"
              )}
            >
              {folder}
            </button>
          ))}
        </div>
        <button
          onClick={handleConfirm}
          className="w-full text-sm font-medium py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Generate
        </button>
      </PopoverContent>
    </Popover>
  );
}
