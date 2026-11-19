import { apiClient } from "./client";

/** A route found in a service's OpenAPI spec (marketflow-api endpoint discovery, Sprint 25). */
export interface DiscoveredEndpoint {
  method: string;
  path: string;
  summary?: string;
  tags?: string[];
  status: "candidate" | "approved" | "rejected";
  first_seen: string;
  last_seen: string;
  decided_by?: string;
  decided_at?: string;
}

/** How a service's last scan went. docs_view "external" means it served only its public spec. */
export interface ScanStatus {
  scanned_at: string;
  error?: string;
  operations: number;
  offerable: number;
  added: number;
  docs_view?: string;
}

export interface ServiceEndpoints {
  service: string;
  endpoints: DiscoveredEndpoint[];
  last_scan?: ScanStatus;
}

/** Why a service offers no routes, in the owner's words, from its last scan. */
export function emptyReason(s: ServiceEndpoints): string {
  const st = s.last_scan;
  if (!st) return "This service has not been scanned yet. Use Scan now.";
  if (st.error) return `The last scan could not read the spec: ${st.error}`;
  if (st.docs_view === "external")
    return `The service served only its public spec (${st.operations} operations). Set MF_ENDPOINT_SCAN_DOCS_KEY to a key it trusts so the full spec is read.`;
  return `The spec lists ${st.operations} operations and none of them is a tenant-scoped, marketing-safe read.`;
}

export type EndpointStatus = DiscoveredEndpoint["status"];

const base = "/api/v1/admin/endpoints";

export const endpointsApi = {
  list: () => apiClient.get<{ services: ServiceEndpoints[] }>(base).then((r) => r.data.services),
  decide: (service: string, e: Pick<DiscoveredEndpoint, "method" | "path">, status: EndpointStatus) =>
    apiClient.patch<ServiceEndpoints>(`${base}/${encodeURIComponent(service)}`, { method: e.method, path: e.path, status }).then((r) => r.data),
  scan: () => apiClient.post<{ new_candidates: number; failed: string[] }>(`${base}/scan`).then((r) => r.data),
};

/** Counts per status across every service, for the page's summary line. */
export function countByStatus(services: ServiceEndpoints[] | undefined): Record<EndpointStatus, number> {
  const out: Record<EndpointStatus, number> = { candidate: 0, approved: 0, rejected: 0 };
  for (const s of services ?? []) for (const e of s.endpoints) out[e.status] += 1;
  return out;
}
