"use client";

import { useState } from "react";
import { ShieldCheck, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, GlassPanel, ToneBadge } from "@/components/ui-kit";
import { apiErrorMessage } from "@/lib/api/errors";
import {
  isPPBHeld,
  normalizePPBReference,
  ppbApprovalsApi,
  ppbCaptionLine,
  ppbReferenceError,
} from "@/lib/api/ppb-approvals";

export function usePPBStatus(briefId: string) {
  return useQuery({
    queryKey: ["ppb-approval", briefId],
    queryFn: () => ppbApprovalsApi.forBrief(briefId),
    staleTime: 30_000,
    retry: false,
  });
}

/**
 * The PPB advert approval reference of the ad's product (Pharmacy and Poisons Act s. 36, rule 22;
 * owner 2026-11-14). Shown only for a pharmacy's medicine ad (supplements and household "dawa" are
 * not medicines): while the reference is missing a promotional version stays a draft (no approve,
 * render, post or boost; availability posts pass) and the owner or an admin enters it here; once
 * entered it is shown with the line the ad carries. Every other ad renders nothing. All references
 * are listed in Settings > PPB approvals.
 */
export function PPBApprovalCard({ briefId, canApprove }: { briefId: string; canApprove: boolean }) {
  const qc = useQueryClient();
  const status = usePPBStatus(briefId);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [touched, setTouched] = useState(false);

  const save = useMutation({
    mutationFn: (reference: string) =>
      ppbApprovalsApi.set({
        offering_key: status.data?.offering_key ?? "",
        offering_name: status.data?.offering_name,
        reference,
      }),
    onSuccess: () => {
      toast.success("Reference saved. You can approve this ad now.");
      setEditing(false);
      setTouched(false);
      void qc.invalidateQueries({ queryKey: ["ppb-approval", briefId] });
      void qc.invalidateQueries({ queryKey: ["ppb-approvals"] });
      void qc.invalidateQueries({ queryKey: ["creative-brief", briefId] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not save the reference")),
  });

  const s = status.data;
  if (!s?.required || !s.offering_key) return null;

  const held = isPPBHeld(s);
  const product = s.offering_name || "this product";
  const error = touched ? ppbReferenceError(value) : null;
  const submit = () => {
    setTouched(true);
    if (ppbReferenceError(value)) return;
    save.mutate(normalizePPBReference(value));
  };

  const form = canApprove && (held || editing) && (
    <form
      className="flex flex-col gap-2 sm:flex-row sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <Field
        label="PPB approval reference"
        htmlFor={`ppb-ref-${briefId}`}
        hint="As written on the Board's approval letter for this advert."
        error={error}
        className="min-w-0 flex-1"
      >
        <Input
          id={`ppb-ref-${briefId}`}
          value={value}
          maxLength={80}
          placeholder="PPB/ADV/2026/0001"
          autoComplete="off"
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => setTouched(true)}
        />
      </Field>
      <div className="flex gap-2">
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? "Saving..." : "Save reference"}
        </Button>
        {editing && !held && (
          <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );

  if (held) {
    return (
      <div role="alert" className="space-y-3 rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm">
        <p className="flex gap-2">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
          <span>
            This ad is for a medicine ({product}). The Pharmacy and Poisons Board must approve every medicine advert before it
            runs, so a poster or video that promotes it (a price, an offer, a call to buy, what it is for or how it helps) stays a
            draft until the PPB approval reference for this product is entered. A plain availability post such as &quot;in
            stock&quot; or your opening hours does not need one.
          </span>
        </p>
        {canApprove ? form : <p className="text-muted-foreground">Ask the business owner or an admin to enter the reference.</p>}
      </div>
    );
  }

  return (
    <GlassPanel>
      <div className="space-y-3 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-2">
            <ShieldCheck className="size-4 shrink-0 text-success" />
            <span>PPB advert approval for {product}</span>
            <ToneBadge tone="success">{s.caption_line || ppbCaptionLine(s.approval?.reference ?? "")}</ToneBadge>
          </p>
          {canApprove && !editing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setValue(s.approval?.reference ?? "");
                setEditing(true);
              }}
            >
              Change
            </Button>
          )}
        </div>
        <p className="text-muted-foreground">
          New posters and video ads for this product carry this line. A poster made before the reference was entered gets it when
          you change its words.
        </p>
        {form}
      </div>
    </GlassPanel>
  );
}
