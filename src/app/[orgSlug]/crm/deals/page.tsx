"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Briefcase, Plus, ThumbsDown, Trophy } from "lucide-react";
import { FeatureLock, useFeature } from "@bengo-hub/shared-ui-lib/subscription";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ActivityTimeline } from "@/components/crm/activity-timeline";
import { CustomFieldsPanel } from "@/components/crm/custom-fields-panel";
import { RecordPicker, type RecordRef } from "@/components/crm/record-picker";
import { CapsuleTabs, EmptyState, ErrorState, Field, PageHeader, StatusBadge } from "@/components/ui-kit";
import { useBoard, useCreateDeal, useDeal, useDealAction, usePipelines, useSetupPipeline } from "@/hooks/use-deals";
import { formatMoney } from "@/lib/api/campaigns";
import type { Deal } from "@/lib/api/deals";
import { sortedStages, type PipelineStage } from "@/lib/api/pipelines";

const dateFmt = new Intl.DateTimeFormat("en-KE", { day: "numeric", month: "short" });

function NewDeal({ pipelineId, stages, onDone }: { pipelineId: string; stages: PipelineStage[]; onDone: () => void }) {
  const create = useCreateDeal();
  const [title, setTitle] = useState("");
  const [stageId, setStageId] = useState(stages[0]?.id ?? "");
  const [value, setValue] = useState("");
  const [currency, setCurrency] = useState("KES");
  const [close, setClose] = useState("");
  const [record, setRecord] = useState<RecordRef | null>(null);
  return (
    <>
      <div className="space-y-4">
        <Field label="Deal" required htmlFor="dl-t" hint="What is being sold, e.g. Wedding package for Achieng."><Input id="dl-t" value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
        <Field label="With"><RecordPicker value={record} onChange={setRecord} /></Field>
        <div>
          <p className="mb-1.5 text-sm font-medium">Stage</p>
          <CapsuleTabs label="Stage" value={stageId} onChange={setStageId} options={stages.map((s) => ({ value: s.id, label: s.name }))} />
        </div>
        <div className="grid grid-cols-[1fr_6rem] gap-3 sm:grid-cols-[1fr_6rem_1fr]">
          <Field label="Value" htmlFor="dl-v"><Input id="dl-v" type="number" inputMode="decimal" min={0} value={value} onChange={(e) => setValue(e.target.value)} /></Field>
          <Field label="Currency" htmlFor="dl-c"><Input id="dl-c" maxLength={3} value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} /></Field>
          <Field label="Expected close" className="col-span-2 sm:col-span-1" htmlFor="dl-d"><Input id="dl-d" type="date" value={close} onChange={(e) => setClose(e.target.value)} /></Field>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onDone}>Cancel</Button>
        <Button
          disabled={!title.trim() || !stageId || currency.length !== 3 || create.isPending}
          onClick={() =>
            create.mutate(
              {
                title: title.trim(),
                pipeline_id: pipelineId,
                stage_id: stageId,
                value: value ? Number(value) : undefined,
                currency,
                expected_close_date: close || undefined,
                ...(record?.type === "contact" ? { contact_id: record.id } : record?.type === "lead" ? { lead_id: record.id } : {}),
              },
              { onSuccess: onDone },
            )
          }
        >
          {create.isPending ? "Adding..." : "Add deal"}
        </Button>
      </DialogFooter>
    </>
  );
}

function DealSheet({ id, stages, onClose }: { id: string; stages: PipelineStage[]; onClose: () => void }) {
  const deal = useDeal(id);
  const act = useDealAction();
  const [reason, setReason] = useState("");
  const d = deal.data;
  const open = stages.filter((s) => !s.is_won_stage && !s.is_lost_stage);
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader><SheetTitle>{d?.title ?? "Deal"}</SheetTitle></SheetHeader>
        {deal.isError && <ErrorState onRetry={() => void deal.refetch()} />}
        {d && (
          <div className="space-y-5 px-4 pb-6">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={d.status} />
              <span className="font-display text-2xl font-semibold tabular">{formatMoney(d.value, d.currency)}</span>
              {d.expected_close_date && <span className="text-sm text-muted-foreground">Expected {dateFmt.format(new Date(d.expected_close_date))}</span>}
            </div>
            {d.status === "open" && (
              <>
                <div>
                  <p className="mb-1.5 text-sm font-medium">Stage</p>
                  <CapsuleTabs label="Move to stage" value={d.stage_id} onChange={(s) => s !== d.stage_id && act.mutate({ id, kind: "move", stageId: s })} options={open.map((s) => ({ value: s.id, label: s.name }))} />
                </div>
                <div className="flex flex-wrap items-end gap-2">
                  <Button onClick={() => act.mutate({ id, kind: "won" })}><Trophy /> Won</Button>
                  <Input aria-label="Why it was lost" placeholder="Why it was lost (optional)" className="w-56" value={reason} onChange={(e) => setReason(e.target.value)} />
                  <Button variant="outline" onClick={() => act.mutate({ id, kind: "lost", reason: reason.trim() || undefined })}><ThumbsDown /> Lost</Button>
                </div>
              </>
            )}
            {d.status === "lost" && d.lost_reason && <p className="text-sm text-muted-foreground">Lost because: {d.lost_reason}</p>}
            <CustomFieldsPanel entity="deal" id={id} />
            <ActivityTimeline entity="deal" id={id} />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Column({ stage, deals, loading, onOpen }: { stage: PipelineStage; deals: Deal[]; loading: boolean; onOpen: (id: string) => void }) {
  const total = deals.reduce((s, d) => s + (d.value ?? 0), 0);
  const currency = deals[0]?.currency ?? "KES";
  return (
    <section className="glass flex w-72 shrink-0 snap-start flex-col rounded-[1.25rem] p-3 sm:w-80" aria-label={stage.name}>
      <header className="mb-3 px-1">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-sm font-semibold">{stage.name}</h2>
          <span className="rounded-full bg-foreground/10 px-2 text-xs font-semibold tabular">{deals.length}</span>
        </div>
        <p className="text-xs text-muted-foreground tabular">{formatMoney(total, currency)}{stage.win_probability != null ? `, ${stage.win_probability}% likely` : ""}</p>
      </header>
      <div className="space-y-2">
        {loading && Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />)}
        {!loading && deals.length === 0 && <p className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">No deals here</p>}
        {deals.map((d) => (
          <button key={d.id} type="button" onClick={() => onOpen(d.id)} className="w-full rounded-xl border border-border bg-card/80 p-3 text-left shadow-soft transition-colors hover:border-primary/50">
            <p className="line-clamp-2 text-sm font-medium">{d.title}</p>
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-semibold text-foreground tabular">{formatMoney(d.value, d.currency)}</span>
              {d.expected_close_date && <span>{dateFmt.format(new Date(d.expected_close_date))}</span>}
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

export default function DealsPage() {
  const has = useFeature("deal_pipeline");
  const search = useSearchParams();
  const pipelines = usePipelines();
  const setup = useSetupPipeline();
  const [pipelineId, setPipelineId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [openId, setOpenId] = useState<string | null>(search.get("deal"));
  const list = pipelines.data ?? [];
  const active = list.find((p) => p.id === pipelineId) ?? list.find((p) => p.is_default) ?? list[0] ?? null;
  const stages = sortedStages(active);
  const boardStages = stages.filter((s) => !s.is_won_stage && !s.is_lost_stage);
  const board = useBoard(active?.id ?? null, boardStages);

  const addBtn = <Button disabled={!active || boardStages.length === 0} onClick={() => setAdding(true)}><Plus /> Add deal</Button>;

  return (
    <div className="space-y-6">
      <PageHeader icon={<Briefcase />} title="Deals" description="What you are selling and where each sale stands." actions={has ? addBtn : <FeatureLock feature="deal_pipeline" mode="block">{addBtn}</FeatureLock>} />
      {list.length > 1 && <CapsuleTabs label="Pipeline" value={active?.id ?? ""} onChange={setPipelineId} options={list.map((p) => ({ value: p.id, label: p.name }))} />}

      {pipelines.isError && <ErrorState message="Could not load your pipelines." onRetry={() => void pipelines.refetch()} />}
      {pipelines.isLoading && <div className="flex gap-4 overflow-hidden">{[0, 1, 2].map((i) => <div key={i} className="glass h-64 w-80 shrink-0 animate-pulse rounded-[1.25rem]" />)}</div>}
      {!pipelines.isLoading && !pipelines.isError && list.length === 0 && (
        <div className="glass rounded-[1.25rem]">
          <EmptyState
            icon={<Briefcase />}
            title="Set up your sales pipeline"
            description="We will create the stages New, Talking, Offer sent, Won and Lost. You can rename them later."
            action={<Button disabled={setup.isPending} onClick={() => setup.mutate()}>{setup.isPending ? "Setting up..." : "Set up pipeline"}</Button>}
          />
        </div>
      )}

      {active && (
        <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
          {boardStages.map((s, i) => (
            <Column key={s.id} stage={s} deals={board[i]?.data?.data ?? []} loading={!!board[i]?.isLoading} onOpen={setOpenId} />
          ))}
        </div>
      )}

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>New deal</DialogTitle></DialogHeader>
          {adding && active && <NewDeal pipelineId={active.id} stages={boardStages} onDone={() => setAdding(false)} />}
        </DialogContent>
      </Dialog>
      {openId && <DealSheet id={openId} stages={stages} onClose={() => setOpenId(null)} />}
    </div>
  );
}
