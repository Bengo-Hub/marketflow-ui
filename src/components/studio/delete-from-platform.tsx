"use client";

import { useState } from "react";
import { ExternalLink, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui-kit";
import { useCanDeleteFromPlatform } from "@/hooks/use-creative";
import { useDeleteFromPlatform } from "@/hooks/use-publishing";
import { apiErrorMessage } from "@/lib/api/errors";
import type { PublishJob } from "@/lib/api/publishing";
import { deleteAction, deleteConfirmText, unsupportedFromError, type DeleteAction } from "@/lib/studio/delete-from-platform";

type Manual = Extract<DeleteAction, { kind: "manual" }>;

/**
 * "Delete from platform" on a published post (owner 2026-11-14). Where the platform's API allows
 * it, the owner and admins (and the Meta app reviewer) delete the post after a confirm; elsewhere everyone sees how to delete
 * it on the platform itself.
 */
export function DeleteFromPlatform({ job }: { job: PublishJob }) {
  const canApprove = useCanDeleteFromPlatform();
  const del = useDeleteFromPlatform();
  const [confirm, setConfirm] = useState(false);
  // A refusal after the list loaded (the permission changed) switches to the manual steps.
  const [manual, setManual] = useState<Manual | null>(null);
  const action = deleteAction(job);
  if (!action) return null;

  const showManual = (m: Manual) => {
    setConfirm(false);
    setManual(m);
  };

  return (
    <>
      {action.kind === "delete" && canApprove ? (
        <Button variant="ghost" size="sm" onClick={() => setConfirm(true)}>
          <Trash2 /> {action.label}
        </Button>
      ) : action.kind === "manual" ? (
        <Button variant="ghost" size="sm" onClick={() => showManual(action)}>
          <Trash2 /> {action.label}
        </Button>
      ) : null}

      <ConfirmDialog
        open={confirm}
        onOpenChange={(o) => {
          setConfirm(o);
          if (!o) del.reset();
        }}
        title="Delete this post from the platform?"
        description={
          <>
            {deleteConfirmText(job.platform)}
            {del.isError && !unsupportedFromError(del.error, job.platform) && (
              <span role="alert" className="mt-2 block text-destructive">
                {apiErrorMessage(del.error, "Could not delete the post.")}
              </span>
            )}
          </>
        }
        confirmLabel="Delete post"
        pending={del.isPending}
        onConfirm={() =>
          del.mutate(job.id, {
            onSuccess: () => setConfirm(false),
            onError: (e) => {
              const m = unsupportedFromError(e, job.platform);
              if (m) showManual(m);
            },
          })
        }
      />

      <Dialog open={!!manual} onOpenChange={(o) => !o && setManual(null)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>{manual?.label}</DialogTitle>
            {manual?.reason && <DialogDescription>{manual.reason}</DialogDescription>}
          </DialogHeader>
          {manual && (
            <div className="space-y-3 text-sm">
              <ol className="list-decimal space-y-1 pl-5">
                {manual.steps.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
              <div className="flex flex-wrap gap-2">
                {job.permalink && (
                  <a href={job.permalink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline">
                    <ExternalLink className="size-4" /> Open the post
                  </a>
                )}
                {manual.helpUrl && (
                  <a href={manual.helpUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline">
                    <ExternalLink className="size-4" /> Platform help
                  </a>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
