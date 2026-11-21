"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui-kit";
import { useDeleteVersion } from "@/hooks/use-creative";

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
