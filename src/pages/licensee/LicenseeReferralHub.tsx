import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Star, Network, UserPlus, Check } from "lucide-react";
import { toast } from "sonner";
import { useClients } from "@/hooks/useClients";
import { useReferralPartners, useCreateReferral, type ReferralPartner } from "@/hooks/useLicensee";
import { Button } from "@/components/ui/button";

interface ClientRow { id: string; name: string }

const StarRating = ({ rating }: { rating: number | null }) => {
  const r = rating ?? 0;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`w-3.5 h-3.5 ${n <= Math.round(r) ? "fill-accent text-accent" : "text-muted-foreground/30"}`}
        />
      ))}
      {rating != null && <span className="ml-1 text-xs text-muted-foreground">{r.toFixed(1)}</span>}
    </div>
  );
};

const LicenseeReferralHub = () => {
  const [searchParams] = useSearchParams();
  const { data: clients = [] } = useClients() as { data: ClientRow[] };
  const { data: partners = [], isLoading } = useReferralPartners();

  const [selectedClient, setSelectedClient] = useState<string>(searchParams.get("client") ?? "");
  const [requested, setRequested] = useState<Set<string>>(new Set());
  const createReferral = useCreateReferral(selectedClient);

  // Group partners by specialty for an organized directory (matches the mockup).
  const grouped = useMemo(() => {
    const map = new Map<string, ReferralPartner[]>();
    for (const p of partners) {
      const key = p.specialty || "Other Specialists";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }
    return Array.from(map.entries());
  }, [partners]);

  const handleRequest = async (partner: ReferralPartner) => {
    if (!selectedClient) {
      toast.error("Select a client first to request a referral.");
      return;
    }
    try {
      await createReferral.mutateAsync({ partner_id: partner.id });
      setRequested((prev) => new Set(prev).add(partner.id));
      toast.success(`Referral to ${partner.name} requested. The Founder's Office will follow up.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not request referral.");
    }
  };

  return (
    <div className="max-w-6xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-display font-semibold text-foreground">
            <Network className="w-6 h-6 text-primary" /> Referral Hub
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Vetted specialists. Request an introduction on behalf of a client.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <label className="text-xs text-muted-foreground">Requesting for</label>
          <select
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
            className="h-9 rounded-md border border-border bg-background px-3 text-sm min-w-[200px]"
          >
            <option value="">Select a client…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading partners…</p>
      ) : partners.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center rounded-xl border border-dashed border-border bg-card py-20 px-8">
          <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center mb-4">
            <Network className="w-6 h-6 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-display font-semibold text-foreground mb-2">No partners yet</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            The Founder's Office is building the vetted referral partner directory. Check back soon.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map(([specialty, list]) => (
            <section key={specialty}>
              <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-3">{specialty}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {list.map((p) => {
                  const done = requested.has(p.id);
                  return (
                    <div key={p.id} className="rounded-xl border border-border bg-card p-4 flex flex-col">
                      <div className="flex items-center gap-3 mb-3">
                        {p.headshot_url ? (
                          <img src={p.headshot_url} alt={p.name} className="w-11 h-11 rounded-full object-cover" />
                        ) : (
                          <div className="w-11 h-11 rounded-full gradient-olive flex items-center justify-center">
                            <span className="text-sm font-semibold text-primary-foreground">
                              {p.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-display font-semibold text-foreground text-sm truncate">{p.name}</p>
                          {p.occupation && <p className="text-xs text-muted-foreground truncate">{p.occupation}</p>}
                        </div>
                      </div>
                      {p.testimonials && (
                        <p className="text-xs text-muted-foreground italic line-clamp-3 mb-3">“{p.testimonials}”</p>
                      )}
                      <div className="mt-auto">
                        <div className="mb-3"><StarRating rating={p.rating} /></div>
                        <Button
                          size="sm"
                          variant={done ? "outline" : "default"}
                          className="w-full gap-1.5"
                          disabled={done || createReferral.isPending}
                          onClick={() => handleRequest(p)}
                        >
                          {done ? <><Check className="w-4 h-4" /> Requested</> : <><UserPlus className="w-4 h-4" /> Request Referral</>}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
};

export default LicenseeReferralHub;
