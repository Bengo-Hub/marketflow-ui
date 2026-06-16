"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, Trash2, DatabaseBackup, Info } from "lucide-react";
import {
  useBackups,
  useCreateBackup,
  useDeleteBackup,
  useDownloadBackup,
  useBackupSettings,
  useUpdateBackupSettings,
  type BackupSettings,
} from "@/hooks/use-backups";

// ── Helpers ──────────────────────────────────────────────────────────────────

function humanSize(bytes: number): string {
  if (!bytes || bytes < 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatHour(h: number): string {
  const hour = ((h % 24) + 24) % 24;
  const period = hour < 12 ? "AM" : "PM";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}:00 ${period}`;
}

// ── Auto-backup schedule card ──────────────────────────────────────────────────

function AutoBackupCard() {
  const { data: settings } = useBackupSettings();
  const updateMut = useUpdateBackupSettings();

  // Local form state — defaults to OPT-IN OFF until settings load.
  const [enabled, setEnabled] = useState(false);
  const [hour, setHour] = useState(2);
  const [retention, setRetention] = useState(30);

  useEffect(() => {
    if (settings) {
      setEnabled(settings.auto_enabled);
      setHour(settings.schedule_hour);
      setRetention(settings.retention_days);
    }
  }, [settings]);

  const dirty =
    !!settings &&
    (enabled !== settings.auto_enabled ||
      hour !== settings.schedule_hour ||
      retention !== settings.retention_days);

  function save() {
    const payload: BackupSettings = {
      auto_enabled: enabled,
      schedule_hour: hour,
      retention_days: retention,
    };
    updateMut.mutate(payload);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Automatic backups</CardTitle>
        <CardDescription>
          Off by default. When enabled, a backup of your organisation&apos;s data
          runs daily at the chosen hour and older backups are pruned
          automatically.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center gap-3">
          <Switch
            checked={enabled}
            onCheckedChange={(checked) => setEnabled(Boolean(checked))}
          />
          <span className="text-sm font-medium">
            {enabled ? "Daily backups enabled" : "Daily backups disabled"}
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Daily backup time</label>
            <Select
              value={String(hour)}
              onValueChange={(v) => setHour(Number(v ?? "2"))}
              disabled={!enabled}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 24 }, (_, h) => (
                  <SelectItem key={h} value={String(h)}>
                    {formatHour(h)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium">Retention (days)</label>
            <Input
              type="number"
              min={1}
              max={365}
              value={retention}
              disabled={!enabled}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (Number.isNaN(n)) return;
                setRetention(Math.min(365, Math.max(1, n)));
              }}
            />
          </div>
        </div>

        <div>
          <Button onClick={save} disabled={!dirty || updateMut.isPending}>
            Save schedule
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function BackupsPage() {
  const { data: backups, isLoading } = useBackups();
  const createMut = useCreateBackup();
  const deleteMut = useDeleteBackup();
  const downloadMut = useDownloadBackup();

  const rows = backups ?? [];

  function onDelete(name: string) {
    if (
      typeof window !== "undefined" &&
      !window.confirm(`Delete backup "${name}"? This cannot be undone.`)
    ) {
      return;
    }
    deleteMut.mutate(name);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Backups</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Create and manage backups of your organisation&apos;s data.
          </p>
        </div>
        <Button
          onClick={() => createMut.mutate()}
          disabled={createMut.isPending}
          className="gap-2"
        >
          <DatabaseBackup className="h-4 w-4" />
          Create backup
        </Button>
      </div>

      <AutoBackupCard />

      {/* Info note */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-3 text-sm text-muted-foreground">
            <Info className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              These backups contain only your organisation&apos;s data and are
              visible only to you.
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Backup list */}
      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>File</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center py-10 text-muted-foreground"
                >
                  Loading…
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center py-10 text-muted-foreground"
                >
                  No backups yet.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((b) => (
                <TableRow key={b.name}>
                  <TableCell className="font-mono text-sm">{b.name}</TableCell>
                  <TableCell className="text-sm">{humanSize(b.size)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {b.created_at
                      ? format(new Date(b.created_at), "PPp")
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Download"
                        disabled={downloadMut.isPending}
                        onClick={() => downloadMut.mutate(b.name)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Delete"
                        disabled={deleteMut.isPending}
                        onClick={() => onDelete(b.name)}
                      >
                        <Trash2 className="h-4 w-4 text-rose-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
