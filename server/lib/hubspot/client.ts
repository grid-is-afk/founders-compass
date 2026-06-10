// ============================================================
// HubSpot CRM v3 API client (read-only).
//
// A thin fetch wrapper around the endpoints the pipeline sync needs. Mirrors the
// style of server/scripts/compare-hubspot-users.ts (raw fetch + Bearer PAT, no
// SDK). Every call here is a GET/search read — this integration never writes to
// HubSpot.
// ============================================================

const BASE = "https://api.hubapi.com";

export interface HubSpotDeal {
  id: string;
  properties: {
    dealname?: string;
    dealstage?: string;
    pipeline?: string;
    amount?: string;
    hubspot_owner_id?: string;
    hs_lastmodifieddate?: string;
  };
}

export interface HubSpotPipelineStage {
  id: string;
  label: string;
  displayOrder: number;
}

export interface HubSpotPipeline {
  id: string;
  label: string;
  stages: HubSpotPipelineStage[];
}

export interface HubSpotContact {
  id: string;
  properties: Record<string, string | null | undefined>;
}

function pat(): string {
  const token = process.env.HUBSPOT_PAT;
  if (!token) throw new Error("HUBSPOT_PAT is not set");
  return token;
}

async function hubspotFetch<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${pat()}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HubSpot ${res.status} on ${path}: ${body.slice(0, 300)}`);
  }
  return (await res.json()) as T;
}

/** Whether the integration is configured (token present). */
export function isHubSpotConfigured(): boolean {
  return Boolean(process.env.HUBSPOT_PAT);
}

/**
 * Search deals modified at or after `sinceIso`, newest-modified first, paginated.
 * Passing `undefined` (first ever sync) returns all deals.
 */
export async function searchModifiedDeals(
  sinceIso: string | undefined
): Promise<HubSpotDeal[]> {
  const deals: HubSpotDeal[] = [];
  let after: string | undefined;
  const properties = [
    "dealname",
    "dealstage",
    "pipeline",
    "amount",
    "hubspot_owner_id",
    "hs_lastmodifieddate",
  ];

  do {
    const body = {
      // No filter on the first full sync; incremental filter thereafter.
      filterGroups: sinceIso
        ? [
            {
              filters: [
                {
                  propertyName: "hs_lastmodifieddate",
                  operator: "GTE",
                  value: String(new Date(sinceIso).getTime()),
                },
              ],
            },
          ]
        : [],
      sorts: [{ propertyName: "hs_lastmodifieddate", direction: "ASCENDING" }],
      properties,
      limit: 100,
      ...(after ? { after } : {}),
    };

    const page = await hubspotFetch<{
      results: HubSpotDeal[];
      paging?: { next?: { after: string } };
    }>("/crm/v3/objects/deals/search", {
      method: "POST",
      body: JSON.stringify(body),
    });

    deals.push(...page.results);
    after = page.paging?.next?.after;
  } while (after);

  return deals;
}

/** All deal pipelines with their stages (id + human label). */
export async function getDealPipelines(): Promise<HubSpotPipeline[]> {
  const data = await hubspotFetch<{ results: HubSpotPipeline[] }>(
    "/crm/v3/pipelines/deals"
  );
  return data.results;
}

/** The primary associated contact id for a deal, or null if none. */
export async function getDealPrimaryContactId(
  dealId: string
): Promise<string | null> {
  const data = await hubspotFetch<{ results: Array<{ id?: string; toObjectId?: string }> }>(
    `/crm/v3/objects/deals/${dealId}/associations/contacts?limit=1`
  );
  const first = data.results?.[0];
  return (first?.toObjectId ?? first?.id ?? null) as string | null;
}

/** Fetch a contact by id, requesting the given properties. */
export async function getContact(
  contactId: string,
  properties: string[]
): Promise<HubSpotContact> {
  const qs = encodeURIComponent(properties.join(","));
  return hubspotFetch<HubSpotContact>(
    `/crm/v3/objects/contacts/${contactId}?properties=${qs}`
  );
}
