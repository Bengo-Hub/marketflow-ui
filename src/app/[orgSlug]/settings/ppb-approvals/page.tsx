"use client";

import { useState } from "react";
import { PenLine, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog, EmptyState, ErrorState, Field, GlassPanel, PageHeader } from "@/components/ui-kit";
import { useCanApprove } from "@/hooks/use-creative";
import { useTeam } from "@/hooks/use-team";
import { apiErrorMessage } from "@/lib/api/errors";
import {
  enteredByLabel,
  normalizePPBReference,
  ppbApprovalsApi,
  ppbReferenceError,
  sortPPBApprovals,
  type PPBApproval,
} from "@/lib/api/ppb-approvals";

const when = new Intl.DateTimeFormat("en-KE", { dateStyle: "medium", timeStyle: "short" });

/**
 * Settings > PPB approvals (owner, 2026-11-14): every Pharmacy and Poisons Board advert approval
 * reference the pharmacy has entered, one per product. Owners and admins change or remove them;
 * everyone else reads. New references are entered from the Studio when an ad asks for one.
 */
export default function PPBApprovalsPage() {
  const qc = useQueryClient();
  const canEdit = useCanApprove();
  const list = useQuery({ queryKey: ["ppb-approvals"], queryFn: ppbApprovalsApi.list });
  // Owners and admins may read the team, so "entered by" can show an email; others see a fallback.
  const team = useTeam();
  const members = canEdit ? team.data?.members : undefined;
  const [editing, setEditing] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const [touched, setTouched] = useState(false);
  const [removing, setRemoving] = useState<PPBApproval | null>(null);

  const save = useMutation({
    mutationFn: (a: { offering_key: string; offering_name?: string; reference: string }) => ppbApprovalsApi.set(a),
    onSuccess: (saved) => {
      toast.success(saved ? "Reference saved" : "Reference removed. Promotional adverts for this product wait for a new one.");
      setEditing(null);
      setRemoving(null);
      setTouched(false);
      void qc.invalidateQueries({ queryKey: ["ppb-approvals"] });
      void qc.invalidateQueries({ queryKey: ["ppb-approval"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not save the reference")),
  });

  const header = (
    <PageHeader
      icon={<ShieldCheck />}
      title="PPB approvals"
      description="The Pharmacy and Poisons Board must approve every medicine advert before it runs. Promotional adverts for a medicine stay drafts until its approval reference is here; availability posts and supplements do not need one."
    />
  );

  if (list.isError) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        {header}
        <ErrorState message={apiErrorMessage(list.error, "Could not load the references.")} onRetry={() => void list.refetch()} />
      </div>
    );
  }
  if (!list.data) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        {header}
        <div className="glass h-48 animate-pulse rounded-[1.25rem]" aria-busy />
      </div>
    );
  }

  const approvals = sortPPBApprovals(list.data.approvals);
  const error = touched ? ppbReferenceError(value) : null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {header}
      {!list.data.pharmacy && (
        <GlassPanel>
          <p className="text-sm text-muted-foreground">
            Your business type is not a pharmacy, so no advert waits for a PPB reference. Any references below are kept but not used.
          </p>
        </GlassPanel>
      )}
      <GlassPanel title="References" description={canEdit ? undefined : "Only the business owner or an admin can change these."}>
        {approvals.length === 0 ? (
          <EmptyState
            icon={<ShieldCheck />}
            title="No references yet"
            description="When a medicine advert in the Studio needs one, enter its PPB approval reference there. It then shows here."
          />
        ) : (
          <ul className="divide-y divide-border">
            {approvals.map((a) => (
              <li key={a.offering_key} className="space-y-2 py-3 first:pt-0 last:pb-0">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 text-sm">
                    <p className="truncate font-medium">{a.offering_name || a.offering_key}</p>
                    <p className="font-mono text-xs">PPB approval ref. {a.reference}</p>
                    <p className="text-xs text-muted-foreground">
                      Entered by {enteredByLabel(a.entered_by, members)}
                      {a.entered_at && !Number.isNaN(Date.parse(a.entered_at)) && <> on {when.format(new Date(a.entered_at))}</>}
                    </p>
                  </div>
                  {canEdit && editing !== a.offering_key && (
                    <div className="flex shrink-0 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditing(a.offering_key);
                          setValue(a.reference);
                          setTouched(false);
                        }}
                      >
                        <PenLine /> Change
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setRemoving(a)}>
                        <Trash2 /> Remove
                      </Button>
                    </div>
                  )}
                </div>
                {canEdit && editing === a.offering_key && (
                  <form
                    className="flex flex-col gap-2 sm:flex-row sm:items-end"
                    onSubmit={(e) => {
                      e.preventDefault();
                      setTouched(true);
                      if (ppbReferenceError(value)) return;
                      save.mutate({ offering_key: a.offering_key, offering_name: a.offering_name, reference: normalizePPBReference(value) });
                    }}
                  >
                    <Field label="PPB approval reference" htmlFor={`ppb-${a.offering_key}`} error={error} className="min-w-0 flex-1">
                      <Input
                        id={`ppb-${a.offering_key}`}
                        value={value}
                        maxLength={80}
                        autoComplete="off"
                        onChange={(e) => setValue(e.target.value)}
                        onBlur={() => setTouched(true)}
                      />
                    </Field>
                    <div className="flex gap-2">
                      <Button type="submit" disabled={save.isPending}>
                        {save.isPending ? "Saving..." : "Save"}
                      </Button>
                      <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </GlassPanel>
      <ConfirmDialog
        open={!!removing}
        onOpenChange={(o) => !o && setRemoving(null)}
        title="Remove this reference?"
        description={
          removing
            ? `Promotional adverts for ${removing.offering_name || "this product"} will stay drafts again until a new reference is entered.`
            : undefined
        }
        confirmLabel="Remove"
        pending={save.isPending}
        onConfirm={() => removing && save.mutate({ offering_key: removing.offering_key, offering_name: removing.offering_name, reference: "" })}
      />
    </div>
  );
}
