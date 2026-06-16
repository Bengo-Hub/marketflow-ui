import { apiClient } from "./client";

/**
 * Backups API client.
 *
 * Tenant scoping is handled centrally by the axios request interceptor in
 * client.ts (X-Tenant-Slug / X-Tenant-ID headers), so the {tenantID} path
 * segment from the backend route is NOT included here — every other UI call
 * follows the same convention.
 */

export interface Backup {
  name: string;
  size: number;
  created_at: string;
}

export interface BackupSettings {
  auto_enabled: boolean;
  schedule_hour: number;
  retention_days: number;
}

export const backupsApi = {
  list: () => apiClient.get<{ backups: Backup[] }>("/api/v1/backups"),
  create: () => apiClient.post<Backup>("/api/v1/backups", {}),
  getSettings: () => apiClient.get<BackupSettings>("/api/v1/backups/settings"),
  updateSettings: (data: BackupSettings) =>
    apiClient.put<BackupSettings>("/api/v1/backups/settings", data),
  remove: (name: string) =>
    apiClient.delete<void>(`/api/v1/backups/${encodeURIComponent(name)}`),

  /**
   * Download a backup as a gzip blob. apiClient has no dedicated blob helper,
   * so we request `responseType: "blob"` (tenant/auth headers still attach via
   * the shared request interceptor) and trigger an anchor click client-side —
   * same anchor pattern as the leads CSV export.
   */
  download: async (name: string) => {
    const res = await apiClient.get(
      `/api/v1/backups/${encodeURIComponent(name)}/download`,
      { responseType: "blob" },
    );
    const url = URL.createObjectURL(res.data as Blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};
