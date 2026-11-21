"use client";

import { useState } from "react";
import { RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui-kit";
import { useDeleteVersion, useRestoreVersion } from "@/hooks/use-creative";

/**
 * Deletes one never-approved version for good (account owner and admins). The API refuses an
 * approved version and the ad's last one; the files and the version go at once.
 */
export function DeleteVersionButton({ briefId, versionId, versionNo }: { briefId: string; versionId: string; versionNo: number }) {
  const [open, setOpen] = useState(false);
  const del = useDeleteVersion(briefId);
  return (
    <>
      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setOpen(true)}>
        <Trash2 /> Delete permanently
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`Delete version ${versionNo} permanently?`}
        description="It is removed for good with its files and cannot be brought back. Credits already used are not returned."
        confirmLabel="Delete permanently"
        variant="danger"
        pending={del.isPending}
        onConfirm={() => del.mutate(versionId, { onSuccess: () => setOpen(false) })}
      />
    </>
  );
}

/** Brings back a discarded version while its files are still stored (account owner and admins). */
export function RestoreVersionButton({ briefId, versionId }: { briefId: string; versionId: string }) {
  const restore = useRestoreVersion(briefId);
  return (
    <Button size="sm" variant="outline" disabled={restore.isPending} onClick={() => restore.mutate(versionId)}>
      <RotateCcw /> {restore.isPending ? "Restoring..." : "Restore"}
    </Button>
  );
}
