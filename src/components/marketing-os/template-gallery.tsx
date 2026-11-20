"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { marketingOsApi, type Template } from "@/lib/api/marketing-os";
import { TemplateFillDialog } from "@/components/marketing-os/template-fill-dialog";
import { templateFields } from "@/lib/templates/fill";
import {
  SORTS,
  activeFilterCount,
  applyFilters,
  clearFilters,
  facetChoices,
  filtersToQuery,
  labelFor,
  maxCreditPrice,
  parseFilters,
  readUsage,
  recordUse,
  type FacetChoice,
  type TemplateFilters,
  type Usage,
} from "@/lib/templates/filters";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown, Search } from "lucide-react";

const selectClass = "min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm";

function browserStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** A labelled native select: keyboard and screen-reader friendly on every phone. */
function FacetSelect({
  label,
  value,
  onChange,
  choices,
  anyLabel,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  choices: FacetChoice[];
  anyLabel: string;
}) {
  const id = useId();
  return (
    <div className="min-w-0 space-y-1">
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <select id={id} className={selectClass} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{anyLabel}</option>
        {choices.map((c) => (
          <option key={c.key} value={c.key}>
            {c.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * Ready requests: playbook starters first, then curated prompts.chat prompts (CC0). Picking one
 * fills the Manager console for the owner to adapt. Filters (who does it, goal, language, channel,
 * and under "More filters" the output, cost, the inputs it asks for and the sort) come from the
 * template data and live in the URL, so a filtered view can be shared.
 */
export function TemplateGallery({ onUse }: { onUse: (text: string) => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [filters, setFilters] = useState<TemplateFilters>(() => parseFilters(params));
  const [q, setQ] = useState(filters.q);
  const [more, setMore] = useState(
    () => !!(filters.output || filters.cost || filters.maxCredits !== null || filters.inputs.length || filters.sort !== "recommended"),
  );
  const [usage, setUsage] = useState<Usage>({});
  const panelId = useId();
  const maxId = useId();

  useEffect(() => setUsage(readUsage(browserStorage())), []);

  // The search box writes the filters a moment after typing stops.
  useEffect(() => {
    const t = setTimeout(() => setFilters((f) => (f.q === q.trim() ? f : { ...f, q: q.trim() })), 300);
    return () => clearTimeout(t);
  }, [q]);

  // Keep the filters in the URL (the Templates tab stays open on a shared link).
  useEffect(() => {
    const current = new URLSearchParams(params?.toString() ?? "");
    if (activeFilterCount(filters) > 0 || filters.q || filters.sort !== "recommended") {
      current.set("tab", "templates");
    }
    const next = filtersToQuery(filters, current);
    if (next !== (params?.toString() ?? "")) {
      router.replace(`${pathname}?${next}`, { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const tq = useQuery({
    queryKey: ["os-template-library", filters.q],
    queryFn: () => marketingOsApi.templateLibrary(filters.q),
    staleTime: 10 * 60 * 1000,
  });
  const rows: Template[] = useMemo(() => tq.data?.templates ?? [], [tq.data]);
  const facets = tq.data?.facets ?? null;

  // The server already searched; the rest of the filters and the sort apply here.
  const shown = useMemo(() => applyFilters(rows, { ...filters, q: "" }, usage), [rows, filters, usage]);
  const active = activeFilterCount(filters);
  const priced = maxCreditPrice(rows);

  const choices = useMemo(
    () => ({
      specialist: facetChoices(rows, facets?.specialists, (t) => t.specialist),
      goal: facetChoices(rows, facets?.goals, (t) => t.goal),
      language: facetChoices(rows, facets?.languages, (t) => t.language),
      channel: facetChoices(rows, facets?.channels, (t) => t.channels),
      output: facetChoices(rows, facets?.outputs, (t) => t.output),
      inputs: facetChoices(rows, facets?.inputs, (t) => t.inputs),
    }),
    [rows, facets],
  );

  const set = <K extends keyof TemplateFilters>(key: K, value: TemplateFilters[K]) =>
    setFilters((f) => ({ ...f, [key]: value }));
  const toggleInput = (key: string) =>
    setFilters((f) => ({ ...f, inputs: f.inputs.includes(key) ? f.inputs.filter((i) => i !== key) : [...f.inputs, key] }));
  const reset = () => {
    setQ("");
    setFilters((f) => clearFilters(f));
  };
  // A template with fields opens the form first; one without goes straight to the manager.
  const [filling, setFilling] = useState<Template | null>(null);
  const use = (t: Template) => {
    setUsage(recordUse(browserStorage(), t.id));
    if (templateFields(t.template).length > 0) setFilling(t);
    else onUse(t.template);
  };

  return (
    <div className="space-y-4">
      <TemplateFillDialog template={filling} onClose={() => setFilling(null)} onUse={onUse} />
      <div className="relative w-full max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search: TikTok ads, launch, email…"
          aria-label="Search templates"
          className="pl-9"
        />
      </div>

      {facets && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <FacetSelect label="Who does it" anyLabel="Anyone on the team" value={filters.specialist}
              onChange={(v) => set("specialist", v)} choices={choices.specialist} />
            <FacetSelect label="Goal" anyLabel="Any goal" value={filters.goal} onChange={(v) => set("goal", v)}
              choices={choices.goal} />
            <FacetSelect label="Language" anyLabel="Any language" value={filters.language}
              onChange={(v) => set("language", v)} choices={choices.language} />
            <FacetSelect label="Channel" anyLabel="Any channel" value={filters.channel}
              onChange={(v) => set("channel", v)} choices={choices.channel} />
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-expanded={more}
            aria-controls={panelId}
            onClick={() => setMore((m) => !m)}
            className="px-2"
          >
            More filters
            <ChevronDown className={`ml-1 h-4 w-4 transition-transform ${more ? "rotate-180" : ""}`} aria-hidden />
          </Button>

          {more && (
            <div id={panelId} className="grid grid-cols-1 gap-3 rounded-xl border p-3 sm:grid-cols-2 lg:grid-cols-4">
              <FacetSelect label="What you get" anyLabel="Any output" value={filters.output}
                onChange={(v) => set("output", v)} choices={choices.output} />
              <div className="min-w-0 space-y-1">
                <label htmlFor={`${panelId}-cost`} className="text-xs font-medium text-muted-foreground">
                  Cost
                </label>
                <select id={`${panelId}-cost`} className={selectClass} value={filters.cost}
                  onChange={(e) => set("cost", e.target.value as TemplateFilters["cost"])}>
                  <option value="">Any cost</option>
                  <option value="chat">Uses your daily chat turns</option>
                  <option value="credits">Paid in AI credits</option>
                </select>
              </div>
              {priced !== null && (
                <div className="min-w-0 space-y-1">
                  <label htmlFor={maxId} className="text-xs font-medium text-muted-foreground">
                    Up to (credits)
                  </label>
                  <Input id={maxId} type="number" inputMode="numeric" min={0} max={priced} className="min-h-11"
                    placeholder={`Any, highest ${priced}`}
                    value={filters.maxCredits ?? ""}
                    onChange={(e) => {
                      const n = e.target.value === "" ? null : Math.max(0, Math.floor(Number(e.target.value)));
                      set("maxCredits", n === null || Number.isFinite(n) ? n : null);
                    }} />
                </div>
              )}
              <div className="min-w-0 space-y-1">
                <label htmlFor={`${panelId}-sort`} className="text-xs font-medium text-muted-foreground">
                  Sort by
                </label>
                <select id={`${panelId}-sort`} className={selectClass} value={filters.sort}
                  onChange={(e) => set("sort", e.target.value as TemplateFilters["sort"])}>
                  {SORTS.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              {choices.inputs.length > 0 && (
                <fieldset className="min-w-0 sm:col-span-2 lg:col-span-4">
                  <legend className="text-xs font-medium text-muted-foreground">Asks you for</legend>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-2">
                    {choices.inputs.map((c) => (
                      <label key={c.key} className="flex min-h-11 items-center gap-2 text-sm sm:min-h-0">
                        <input type="checkbox" className="h-4 w-4" checked={filters.inputs.includes(c.key)}
                          onChange={() => toggleInput(c.key)} />
                        {c.label}
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}
              {filters.sort === "most_used" && (
                <p className="text-xs text-muted-foreground sm:col-span-2 lg:col-span-4">
                  Most used counts the templates you picked on this device.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {!tq.isLoading && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <p aria-live="polite" className="text-muted-foreground">
            {shown.length === 1 ? "1 template" : `${shown.length} templates`}
          </p>
          {(active > 0 || filters.q) && (
            <button type="button" onClick={reset} className="underline underline-offset-2">
              Clear filters
            </button>
          )}
        </div>
      )}

      {tq.isLoading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : shown.length === 0 ? (
        <div className="space-y-2 rounded-xl border border-dashed p-6 text-center">
          <p className="text-sm text-muted-foreground">
            {filters.q ? <>Nothing matches &ldquo;{filters.q}&rdquo; with these filters.</> : "No template matches these filters."}{" "}
            Try fewer filters, or just describe what you need in the console.
          </p>
          <Button type="button" size="sm" variant="outline" onClick={reset}>
            Reset filters
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {shown.map((t) => (
            <div key={t.id} className="flex min-w-0 flex-col gap-2 rounded-xl border p-4">
              <p className="font-medium break-words">{t.title}</p>
              <p className="text-sm text-muted-foreground line-clamp-3 whitespace-pre-wrap break-words">{t.template}</p>
              {(t.goal || t.language === "sw" || (t.channels?.length ?? 0) > 0) && (
                <div className="flex flex-wrap gap-1">
                  {t.goal && <Badge variant="secondary">{labelFor(facets?.goals, t.goal)}</Badge>}
                  {t.output && <Badge variant="outline">{labelFor(facets?.outputs, t.output)}</Badge>}
                  {t.language && t.language !== "en" && <Badge variant="outline">{labelFor(facets?.languages, t.language)}</Badge>}
                  {(t.channels ?? []).map((c) => (
                    <Badge key={c} variant="outline">
                      {labelFor(facets?.channels, c)}
                    </Badge>
                  ))}
                </div>
              )}
              <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-1">
                <span className="min-w-0 text-xs text-muted-foreground">
                  {t.specialist ? labelFor(facets?.specialists, t.specialist) : t.category}
                  {t.credits != null ? ` · from ${t.credits} credits` : t.specialist ? " · uses chat turns" : ""}
                </span>
                <Button size="sm" variant="outline" onClick={() => use(t)} aria-label={`Use this: ${t.title}`}>
                  Use this
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
