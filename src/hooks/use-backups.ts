"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { backupsApi, type Backup, type BackupSettings } from "@/lib/api/backups";

const errMsg = (err: any, fallback: string) =>
  err?.response?.data?.message || err?.message || fallback;

export function useBackups() {
  return useQuery({
    queryKey: ["backups"],
    queryFn: async () => {
      const res = await backupsApi.list();
      return res.data.backups ?? [];
    },
  });
}

export function useCreateBackup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => backupsApi.create(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["backups"] });
      toast.success("Backup created");
    },
    onError: (err: any) => toast.error(errMsg(err, "Failed to create backup")),
  });
}

export function useDeleteBackup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => backupsApi.remove(name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["backups"] });
      toast.success("Backup deleted");
    },
    onError: (err: any) => toast.error(errMsg(err, "Failed to delete backup")),
  });
}

export function useDownloadBackup() {
  return useMutation({
    mutationFn: (name: string) => backupsApi.download(name),
    onError: (err: any) => toast.error(errMsg(err, "Failed to download backup")),
  });
}

export function useBackupSettings() {
  return useQuery({
    queryKey: ["backup-settings"],
    queryFn: async () => {
      const res = await backupsApi.getSettings();
      return res.data;
    },
  });
}

export function useUpdateBackupSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: BackupSettings) => backupsApi.updateSettings(data),
    onSuccess: (res) => {
      qc.setQueryData(["backup-settings"], res.data);
      toast.success("Backup schedule saved");
    },
    onError: (err: any) => toast.error(errMsg(err, "Failed to save schedule")),
  });
}

export type { Backup, BackupSettings };
