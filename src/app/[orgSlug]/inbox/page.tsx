"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Eye, EyeOff, Inbox, MessageCircle, Reply, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { CapsuleTabs, ConfirmDialog, EmptyState, ErrorState, Field, GlassPanel, PageHeader, ToneBadge, type Tone } from "@/components/ui-kit";
import { useInbox, useInboxDelete, useInboxHandled, useInboxHide, useInboxPromote, useInboxReply } from "@/hooks/use-inbox";
import { useIsRestricted, useMyAccess } from "@/hooks/use-access";
import { canModerate } from "@/lib/inbox/moderation";
import { apiErrorMessage } from "@/lib/api/errors";
import { INTENT_LABEL, MAX_AUTO_REPLY, MAX_REPLY, type InboxFilter, type InboxItem } from "@/lib/api/inbox";
import { marketingOsApi } from "@/lib/api/marketing-os";

type View = "buyers" | "open" | "all";

const when = new Intl.DateTimeFormat("en-KE", { dateStyle: "medium", timeStyle: "short" });

function tone(it: InboxItem): Tone {
  if (it.intent_status === "flagged") return "danger";
  if (it.intent?.startsWith("buyer_")) return "success";
  if (it.intent === "complaint") return "warning";
  return "neutral";
}

export default function InboxPage() {
  const [view, setView] = useState<View>("buyers");
  const filter = useMemo<InboxFilter>(
    () => (view === "buyers" ? { intent: "buyer", open: true } : view === "open" ? { open: true } : {}),
    [view],
  );
  const inbox = useInbox(filter);
  const items = useMemo(() => inbox.data?.pages.flatMap((p) => p.data) ?? [], [inbox.data]);
  // The app reviewer reads and replies: no automatic-reply settings.
  const restricted = useIsRestricted();

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Inbox />}
        title="Inbox"
        description="Comments and messages on your Facebook Page and Instagram. People asking to buy are marked so you can answer them first."
      />
      {!restricted && <AutoReplySettings />}
      <CapsuleTabs
        label="Which messages to show"
        value={view}
        onChange={setView}
        options={[
          { value: "buyers" as const, label: "Buyers to answer" },
          { value: "open" as const, label: "Not handled" },
          { value: "all" as const, label: "Everything" },
        ]}
      />
      {inbox.isError ? (
        <ErrorState message={apiErrorMessage(inbox.error, "Could not load the inbox.")} onRetry={() => void inbox.refetch()} />
      ) : inbox.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<MessageCircle />}
          title={view === "buyers" ? "No buyers waiting" : "Nothing here yet"}
          description="New comments and messages show here within a minute of arriving, once your Page and Instagram are connected."
        />
      ) : (
        <GlassPanel bodyClassName="divide-y divide-border p-0">
          {items.map((it) => (
            <Row key={it.id} item={it} />
          ))}
        </GlassPanel>
      )}
      {inbox.hasNextPage && (
        <Button variant="outline" disabled={inbox.isFetchingNextPage} onClick={() => void inbox.fetchNextPage()}>
          {inbox.isFetchingNextPage ? "Loading..." : "Show more"}
        </Button>
      )}
    </div>
  );
}

function Row({ item: it }: { item: InboxItem }) {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const reply = useInboxReply();
  const handled = useInboxHandled();
  const promote = useInboxPromote();
  // The app reviewer replies only: adding to leads and marking handled are closed to it.
  const restricted = useIsRestricted();
  // Hide, unhide and delete: Facebook and Instagram comments, for members, admins and the reviewer.
  const { data: access } = useMyAccess();
  const moderate = canModerate(it, access);
  const hide = useInboxHide();
  const remove = useInboxDelete();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  return (
    <div className="space-y-3 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">{it.sender_name || "Someone"}</span>
        <span className="text-xs text-muted-foreground">
          {it.platform === "instagram" ? "Instagram" : "Facebook"} {it.kind === "dm" ? "message" : "comment"}, {when.format(new Date(it.at))}
        </span>
        {it.intent && <ToneBadge tone={tone(it)}>{INTENT_LABEL[it.intent] ?? it.intent}</ToneBadge>}
        {it.replied_at && <ToneBadge tone="info">Replied</ToneBadge>}
        {it.handled_at && <ToneBadge tone="neutral">Handled</ToneBadge>}
        {it.hidden && !it.deleted_at && <ToneBadge tone="warning">Hidden</ToneBadge>}
        {it.deleted_at && <ToneBadge tone="danger">Deleted</ToneBadge>}
      </div>
      <p className="whitespace-pre-line text-sm">{it.text}</p>
      {it.intent_status === "flagged" && (
        <p className="text-xs text-destructive">This looks like an attempt to trick an automatic reply. Nothing was sent.</p>
      )}
      <div className="flex flex-wrap gap-2">
        {it.can_reply ? (
          <Button size="sm" variant="outline" onClick={() => setOpen((o) => !o)}>
            <Reply /> Reply
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">{it.reply_window}</span>
        )}
        {it.lead_id ? (
          <Link href={`/${orgSlug}/leads/${it.lead_id}`} className="text-sm font-medium text-primary hover:underline">
            Open lead
          </Link>
        ) : (
          !restricted && (
            <Button size="sm" variant="ghost" disabled={promote.isPending} onClick={() => promote.mutate(it.id)}>
              <UserPlus /> Add to leads
            </Button>
          )
        )}
        {!it.handled_at && !restricted && (
          <Button size="sm" variant="ghost" disabled={handled.isPending} onClick={() => handled.mutate(it.id)}>
            <Check /> Mark handled
          </Button>
        )}
        {moderate && (
          <>
            <Button size="sm" variant="ghost" disabled={hide.isPending} onClick={() => hide.mutate({ id: it.id, hidden: !it.hidden })}>
              {it.hidden ? <Eye /> : <EyeOff />} {it.hidden ? "Unhide" : "Hide"}
            </Button>
            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setConfirmDelete(true)}>
              <Trash2 /> Delete
            </Button>
          </>
        )}
      </div>
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this comment?"
        description={`It is removed from your ${it.platform === "instagram" ? "Instagram post" : "Facebook post"} for everyone. This cannot be undone; it stays here marked as deleted.`}
        confirmLabel="Delete"
        variant="danger"
        pending={remove.isPending}
        onConfirm={() => remove.mutate(it.id, { onSuccess: () => setConfirmDelete(false) })}
      />
      {open && (
        <div className="space-y-2">
          <Textarea
            rows={3}
            value={text}
            maxLength={MAX_REPLY}
            aria-label={`Reply to ${it.sender_name || "this person"}`}
            placeholder={it.kind === "dm" ? "Your message" : "Your public reply under the comment"}
            onChange={(e) => setText(e.target.value)}
          />
          <Button
            size="sm"
            disabled={reply.isPending || !text.trim()}
            onClick={() => reply.mutate({ id: it.id, text: text.trim() }, { onSuccess: () => { setText(""); setOpen(false); } })}
          >
            {reply.isPending ? "Sending..." : "Send"}
          </Button>
        </div>
      )}
    </div>
  );
}

/** The automatic answer to buyers. Saving it on with a message is the owner's approval of that message. */
function AutoReplySettings() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const qc = useQueryClient();
  const settings = useQuery({ queryKey: ["os-settings", orgSlug], queryFn: marketingOsApi.settings });
  const [draft, setDraft] = useState<string | null>(null);
  const text = draft ?? settings.data?.inbox_reply_text ?? "";
  const save = useMutation({
    mutationFn: (s: { inbox_auto_reply: boolean; inbox_reply_text: string }) => marketingOsApi.saveSettings(s),
    onSuccess: (saved) => {
      qc.setQueryData(["os-settings", orgSlug], saved);
      setDraft(null);
      toast.success(saved.inbox_auto_reply ? "Automatic replies are on" : "Automatic replies saved and off");
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not save the automatic reply")),
  });
  const on = settings.data?.inbox_auto_reply ?? false;
  return (
    <GlassPanel>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-sm font-medium">Answer buyers automatically</p>
            <p className="mt-1 text-sm text-muted-foreground">
              When someone asks about a price, delivery or stock, they get your message below. One automatic answer per person a day; complaints and anything unclear wait for you.
            </p>
          </div>
          <Switch
            checked={on}
            disabled={settings.isLoading || save.isPending || !text.trim()}
            onCheckedChange={(v: boolean) => save.mutate({ inbox_auto_reply: v, inbox_reply_text: text })}
            aria-label="Answer buyers automatically"
          />
        </div>
        <Field
          label="Your message"
          htmlFor="auto-reply-text"
          hint={`${text.length} of ${MAX_AUTO_REPLY}. {{booking_link}} and {{profile_link}} become your links.`}
        >
          <Textarea
            id="auto-reply-text"
            rows={3}
            maxLength={MAX_AUTO_REPLY}
            value={text}
            placeholder="Thanks for asking! See prices and order here: {{profile_link}}"
            onChange={(e) => setDraft(e.target.value)}
          />
        </Field>
        {draft !== null && (
          <Button size="sm" disabled={save.isPending} onClick={() => save.mutate({ inbox_auto_reply: on && !!text.trim(), inbox_reply_text: text })}>
            Save message
          </Button>
        )}
      </div>
    </GlassPanel>
  );
}
