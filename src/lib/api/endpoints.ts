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

export interface ServiceEndpoints {
  service: string;
  endpoints: DiscoveredEndpoint[];
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
