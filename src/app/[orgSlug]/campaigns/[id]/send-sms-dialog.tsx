"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Send } from "lucide-react";

import { campaignsApi, type SendSMSResult } from "@/lib/api/campaigns";
import { segmentsApi } from "@/lib/api/segments";
import { STALE_TIMES } from "@/app/providers";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Mirrors the Segment shape used on the CRM segments page.
type Segment = {
  id: string;
  name: string;
  member_count?: number;
};

// 1 SMS "segment" (part) is ~160 GSM-7 chars. Purely informational counter.
const SMS_PART_SIZE = 160;

export function SendSMSDialog({
  campaignId,
  campaignName,
}: {
  campaignId: string;
  campaignName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [segmentId, setSegmentId] = useState<string>("");
  const [message, setMessage] = useState("");

  // Reuse the existing segments list hook/api-client — no re-implementation.
  const { data: segmentsData, isLoading: segmentsLoading } = useQuery({
    queryKey: ["segments"],
    queryFn: () => segmentsApi.list().then((r) => r.data),
    staleTime: STALE_TIMES.OPERATIONAL,
    enabled: open,
  });

  const segments: Segment[] = segmentsData?.data ?? segmentsData ?? [];

  const sendSMS = useMutation({
    mutationFn: async () => {
      const r = await campaignsApi.sendSMS(campaignId, {
        segment_id: segmentId,
        message: message.trim(),
      });
      return r.data;
    },
    onSuccess: (res: SendSMSResult) => {
      toast.success(res.status === "pending_approval" ? "Ready for approval in Notifications > Broadcasts" : "SMS send created");
      setOpen(false);
      setMessage("");
      setSegmentId("");
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Could not create the SMS send");
    },
  });

  const charCount = message.length;
  const parts = charCount === 0 ? 0 : Math.ceil(charCount / SMS_PART_SIZE);
  const selectedSegment = segments.find((s) => s.id === segmentId);
  const canSend = !!segmentId && message.trim().length > 0 && !sendSMS.isPending;

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Send className="mr-2 h-4 w-4" /> Send SMS
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Send SMS{campaignName ? ` — ${campaignName}` : ""}
            </DialogTitle>
          </DialogHeader>

          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (canSend) sendSMS.mutate();
            }}
          >
            <div>
              <label className="mb-1 block text-sm font-medium">Segment</label>
              <Select
                value={segmentId}
                onValueChange={(v) => setSegmentId(v ?? "")}
                disabled={segmentsLoading}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      segmentsLoading ? "Loading segments…" : "Choose a segment"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {segments.length === 0 && !segmentsLoading ? (
                    <SelectItem value="__none" disabled>
                      No segments available
                    </SelectItem>
                  ) : (
                    segments.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                        {typeof s.member_count === "number"
                          ? ` (${s.member_count})`
                          : ""}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Message</label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your SMS message…"
                rows={4}
                required
              />
              <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                <span>
                  {charCount} char{charCount === 1 ? "" : "s"}
                </span>
                <span>
                  {parts} SMS part{parts === 1 ? "" : "s"} · ~{SMS_PART_SIZE}/part
                </span>
              </div>
            </div>

            {canSend && selectedSegment && (
              <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
                Sending to{" "}
                <span className="font-medium text-foreground">
                  {selectedSegment.name}
                </span>
                {typeof selectedSegment.member_count === "number"
                  ? ` (${selectedSegment.member_count} recipients)`
                  : ""}
                .
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!canSend}>
                {sendSMS.isPending ? "Sending…" : "Send"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
