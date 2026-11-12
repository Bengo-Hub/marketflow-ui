import { apiClient } from "./client";
import type { MyAccess } from "@/lib/access/role-access";

export const accessApi = {
  /** GET /api/v1/me/access: the caller's MarketFlow role in the tenant they act for. */
  me: () => apiClient.get<MyAccess>("/api/v1/me/access").then((r) => r.data),
};
