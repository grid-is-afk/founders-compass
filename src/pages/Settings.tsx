import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { getBrowserTimezone, listSupportedTimezones, formatInTimezone } from "@/lib/datetime";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

export default function Settings() {
  const { user, setUser } = useAuth();

  const browserTz = useMemo(() => getBrowserTimezone(), []);
  const supportedTimezones = useMemo(() => {
    const list = listSupportedTimezones();
    return list.length > 0 ? list : [browserTz, "UTC"];
  }, [browserTz]);

  const initialTz = user?.timezone || browserTz;
  const [selectedTz, setSelectedTz] = useState<string>(initialTz);
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const isDirty = selectedTz !== (user?.timezone || browserTz);
  const usingAutoDetect = !user?.timezone;

  const previewNow = useMemo(
    () => formatInTimezone(new Date(), selectedTz, { dateStyle: "full", timeStyle: "short" }),
    [selectedTz]
  );

  async function handleSave() {
    if (!isDirty || saving) return;
    setSaving(true);
    try {
      const updated = await api.patch("/users/me", { timezone: selectedTz });
      setUser(updated);
      toast.success("Timezone updated", {
        description: `Times will now display in ${selectedTz}.`,
      });
    } catch (err) {
      toast.error("Could not save timezone", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <header className="mb-10">
        <h1 className="font-display text-3xl font-semibold text-foreground">Settings</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Manage how the platform displays information to you.
        </p>
      </header>

      <section className="rounded-lg border border-border bg-card p-6 space-y-6">
        <div>
          <h2 className="font-display text-lg font-semibold text-foreground">Display Preferences</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            These choices affect only how data is rendered to you — they do not change underlying records.
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="timezone-trigger" className="block text-sm font-medium text-foreground">
            Timezone
          </label>
          <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
            <PopoverTrigger asChild>
              <Button
                id="timezone-trigger"
                variant="outline"
                role="combobox"
                aria-expanded={comboboxOpen}
                className="w-full justify-between font-normal"
              >
                <span className="truncate">{selectedTz}</span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
              <Command>
                <CommandInput placeholder="Search timezone…" />
                <CommandList>
                  <CommandEmpty>No timezone found.</CommandEmpty>
                  <CommandGroup>
                    {supportedTimezones.map((tz) => (
                      <CommandItem
                        key={tz}
                        value={tz}
                        onSelect={(value) => {
                          setSelectedTz(value);
                          setComboboxOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedTz === tz ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {tz}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          <div className="flex flex-col gap-1 text-xs text-muted-foreground">
            {usingAutoDetect && (
              <p>
                Auto-detected from your browser ({browserTz}). Save to lock this preference across devices.
              </p>
            )}
            <p>
              Preview: <span className="text-foreground">{previewNow}</span>
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-border">
          <Button onClick={handleSave} disabled={!isDirty || saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </section>
    </div>
  );
}
