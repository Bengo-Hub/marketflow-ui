"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Activity as ActivityIcon } from "lucide-react";
import { CapsuleTabs, EmptyState, ErrorState, Pager, PageHeader, ToneBadge, humanize } from "@/components/ui-kit";
import { useActivities } from "@/hooks/use-activities";

const TYPES = ["all", "note", "call", "email", "meeting", "whatsapp", "sms", "order", "payment", "pos_sale"] as const;
const when = new Intl.DateTimeFormat("en-KE", { dateStyle: "medium", timeStyle: "short" });

/** Everything that happened with leads, contacts and deals, newest first (GET /activities, tenant-wide). */
export default function ActivitiesPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const [type, setType] = useState<string>("all");
  const [entity, setEntity] = useState<string>("all");
  const [page, setPage] = useState(1);
  const params: Record<string, string | number> = { page, limit: 30 };
  if (type !== "all") params.activity_type = type;
  if (entity !== "all") params.entity_type = entity;
  const q = useActivities(params);
  const rows = q.data?.data ?? [];

  const href = (t: string, id: string) =>
    t === "lead" ? `/${orgSlug}/leads/${id}` : t === "contact" ? `/${orgSlug}/contacts/${id}` : `/${orgSlug}/crm/deals?deal=${id}`;

  return (
    <div className="space-y-6">
      <PageHeader icon={<ActivityIcon />} title="Activities" description="Calls, messages, notes, orders and payments across your leads, contacts and deals." />
      <div className="flex flex-col gap-3">
        <CapsuleTabs
          label="Filter by record"
          value={entity}
          onChange={(v) => { setEntity(v); setPage(1); }}
          options={[{ value: "all", label: "Everything" }, { value: "lead", label: "Leads" }, { value: "contact", label: "Contacts" }, { value: "deal", label: "Deals" }]}
        />
        <CapsuleTabs
          label="Filter by activity type"
          value={type}
          onChange={(v) => { setType(v); setPage(1); }}
          options={TYPES.map((t) => ({ value: t, label: t === "all" ? "All types" : t === "sms" ? "SMS" : t === "pos_sale" ? "POS sale" : humanize(t) }))}
        />
      </div>

      <div className="glass rounded-[1.25rem] p-2 sm:p-4">
        {q.isError && <ErrorState onRetry={() => void q.refetch()} />}
        {q.isLoading && (
          <div className="space-y-2 p-2" aria-busy>
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />)}
          </div>
        )}
        {!q.isLoading && !q.isError && rows.length === 0 && (
          <EmptyState icon={<ActivityIcon />} title="No activity yet" description="Log a call or note from a lead, contact or deal, or wait for orders and messages to come in." />
        )}
        {rows.length > 0 && (
          <ul className="divide-y divide-border">
            {rows.map((a) => (
              <li key={a.id} className="flex flex-col gap-1 p-3 sm:flex-row sm:items-start sm:gap-4">
                <span className="w-40 shrink-0 text-xs text-muted-foreground tabular">{when.format(new Date(a.performed_at || a.created_at))}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <ToneBadge tone="primary">{humanize(a.activity_type)}</ToneBadge>
                    <Link href={href(a.entity_type, a.entity_id)} className="text-sm font-semibold hover:text-primary">
                      {a.subject || `${humanize(a.entity_type)} activity`}
                    </Link>
                    {a.direction && <ToneBadge>{humanize(a.direction)}</ToneBadge>}
                  </div>
                  {a.body && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{a.body}</p>}
                </div>
                <span className="text-xs text-muted-foreground">{humanize(a.entity_type)}</span>
              </li>
            ))}
          </ul>
        )}
        {q.data && <div className="px-2"><Pager page={page} limit={q.data.limit || 30} total={q.data.total} onPage={setPage} /></div>}
      </div>
    </div>
  );
}
