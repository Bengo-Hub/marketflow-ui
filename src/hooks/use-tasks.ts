"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/api/errors";
import { tasksApi, type TaskInput } from "@/lib/api/tasks";

export type TaskFilter = "open" | "in_progress" | "overdue" | "done";

export function useTasks(filter: TaskFilter, page: number) {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  return useQuery({
    queryKey: ["tasks", orgSlug, filter, page],
    queryFn: () => tasksApi.page(filter, page),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

function useRefresh() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ["tasks"] });
    void qc.invalidateQueries({ queryKey: ["attention"] });
  };
}

export function useSaveTask() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ id, data }: { id?: string; data: Partial<TaskInput> & { status?: string } }) =>
      id ? tasksApi.update(id, data) : tasksApi.create(data as TaskInput),
    onSuccess: (_t, v) => {
      toast.success(v.id ? "Task saved" : "Task added");
      refresh();
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not save the task")),
  });
}

export function useCompleteTask() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (id: string) => tasksApi.complete(id),
    onSuccess: () => {
      toast.success("Task done");
      refresh();
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not complete the task")),
  });
}

export function useDeleteTask() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (id: string) => tasksApi.remove(id),
    onSuccess: () => {
      toast.success("Task deleted");
      refresh();
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not delete the task")),
  });
}
