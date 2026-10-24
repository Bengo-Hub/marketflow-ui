import { apiClient } from "./client";
import type { EntityType } from "./activities";
import type { Paginated } from "./types";

export const TASK_PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export const TASK_STATUSES = ["open", "in_progress", "done"] as const;

/** A task (marketflow-api ent.Task). */
export interface Task {
  id: string;
  entity_type: EntityType;
  entity_id: string;
  title: string;
  description?: string | null;
  due_at?: string | null;
  priority: (typeof TASK_PRIORITIES)[number] | string;
  status: (typeof TASK_STATUSES)[number] | string;
  completed_at?: string | null;
  created_at: string;
}

export interface TaskInput {
  entity_type: EntityType;
  entity_id: string;
  title: string;
  description?: string;
  /** RFC 3339. */
  due_at?: string;
  priority?: string;
}

export const tasksApi = {
  list: (params: Record<string, string>) => apiClient.get<Paginated<Task>>("/api/v1/tasks", { params }),
  page: (filter: "open" | "in_progress" | "overdue" | "done", page: number, limit = 30) =>
    apiClient
      .get<Paginated<Task>>("/api/v1/tasks", { params: { ...(filter === "overdue" ? { overdue: "true" } : { status: filter }), page, limit } })
      .then((r) => r.data),
  create: (data: TaskInput) => apiClient.post<Task>("/api/v1/tasks", data).then((r) => r.data),
  update: (id: string, data: Partial<TaskInput> & { status?: string }) => apiClient.put<Task>(`/api/v1/tasks/${id}`, data).then((r) => r.data),
  complete: (id: string) => apiClient.post<Task>(`/api/v1/tasks/${id}/complete`).then((r) => r.data),
  remove: (id: string) => apiClient.delete(`/api/v1/tasks/${id}`).then(() => undefined),
};
