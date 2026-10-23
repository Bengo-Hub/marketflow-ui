"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { SearchableCombobox } from "@bengo-hub/shared-ui-lib/combobox";
import { useTenantBranding } from "@bengo-hub/shared-ui-lib/tenant";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui-kit";
import { campaignsApi } from "@/lib/api/campaigns";
import { apiErrorMessage } from "@/lib/api/errors";
import { segmentsApi } from "@/lib/api/segments";
import { rows } from "@/lib/api/types";

type Segment = { id: string; name: string; member_count?: number; entity_type?: string };

// One SMS part is about 160 GSM-7 characters (informational).
const SMS_PART_SIZE = 160;

/** Sends a campaign SMS to a segment. It becomes a broadcast that waits for approval in Notifications. */
export function SendSMSDialog({ campaignId, campaignName }: { campaignId: string; campaignName?: string }) {
  const { tenant } = useTenantBranding();
  const [open, setOpen] = useState(false);
  const [segmentId, setSegmentId] = useState("");
  const [message, setMessage] = useState("");

  const segments = useQuery({
    queryKey: ["segments", "picker"],
    queryFn: () => segmentsApi.list().then((r) => rows<Segment>(r.data)),
    enabled: open,
    staleTime: 60_000,
  });

  const send = useMutation({
    mutationFn: () => {
      if (!tenant?.id) throw new Error("Your workspace is still loading. Try again in a moment.");
      return campaignsApi.sendSMS(tenant.id, campaignId, { segment_id: segmentId, message: message.trim() });
    },
    onSuccess: (res) => {
      toast.success(res.status === "pending_approval" ? "Send created. Approve it in Notifications, Broadcasts." : "SMS send created");
      setOpen(false);
      setMessage("");
      setSegmentId("");
    },
    onError: (e) => toast.error(apiErrorMessage(e, (e as Error)?.message || "Could not create the SMS send")),
  });

  const parts = message.length === 0 ? 0 : Math.ceil(message.length / SMS_PART_SIZE);
  const selected = (segments.data ?? []).find((s) => s.id === segmentId);
  const canSend = !!segmentId && message.trim().length > 0 && !send.isPending;

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Send />
        Send SMS
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Send an SMS{campaignName ? `: ${campaignName}` : ""}</DialogTitle>
            <DialogDescription>Opt-outs and quiet hours are respected. The send waits for approval in Notifications, Broadcasts.</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (canSend) send.mutate();
            }}
          >
            <Field label="Send to" required>
              <SearchableCombobox
                options={(segments.data ?? []).map((s) => ({
                  value: s.id,
                  label: typeof s.member_count === "number" ? `${s.name} (${s.member_count.toLocaleString()})` : s.name,
                }))}
                value={segmentId}
                onChange={(v: string) => setSegmentId(v)}
                placeholder={segments.isLoading ? "Loading segments..." : "Choose a segment"}
                emptyText="No segments yet. Create one under CRM, Segments."
              />
            </Field>
            <Field
              label="Message"
              required
              htmlFor="sms-msg"
              hint={`${message.length} characters, ${parts} SMS part${parts === 1 ? "" : "s"} (about ${SMS_PART_SIZE} each)`}
            >
              <Textarea id="sms-msg" rows={4} value={message} onChange={(e) => setMessage(e.target.value)} />
            </Field>
            {selected && typeof selected.member_count === "number" && (
              <p className="rounded-xl bg-muted/60 p-3 text-sm">
                Goes to <strong>{selected.member_count.toLocaleString()}</strong> people in <strong>{selected.name}</strong>
                {parts > 0 ? `, about ${(selected.member_count * parts).toLocaleString()} SMS parts in total` : ""}.
              </p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!canSend}>
                {send.isPending ? "Creating..." : "Create send"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
