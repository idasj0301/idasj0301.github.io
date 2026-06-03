export type LeadPayload = {
  name: string;
  contact: string;
  interest?: string;
  note?: string;
  tripSlug?: string;
  tripTitle?: string;
  pageUrl?: string;
  source: string;
  submittedAt: string;
};

const STORAGE_KEY = "chuanke_leads_v1";

export function getLeadEndpoint(): string {
  return (import.meta.env.PUBLIC_LEAD_ENDPOINT ?? "").trim();
}

export function saveLeadLocal(payload: LeadPayload): void {
  try {
    const prev = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as LeadPayload[];
    const next = [payload, ...prev].slice(0, 50);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota / private mode */
  }
}

export async function submitLead(payload: LeadPayload): Promise<{ ok: boolean; via: "webhook" | "local" }> {
  const endpoint = getLeadEndpoint();
  if (endpoint) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        saveLeadLocal(payload);
        return { ok: true, via: "webhook" };
      }
    } catch {
      /* fall through */
    }
  }
  saveLeadLocal(payload);
  return { ok: true, via: "local" };
}
