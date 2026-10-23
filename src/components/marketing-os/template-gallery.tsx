"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { marketingOsApi, type Template } from "@/lib/api/marketing-os";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search } from "lucide-react";

/**
 * Ready requests: playbook starters first, then curated prompts.chat prompts
 * (CC0). Picking one fills the Manager console for the owner to adapt.
 */
export function TemplateGallery({ onUse }: { onUse: (text: string) => void }) {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const tq = useQuery({
    queryKey: ["os-templates", debounced],
    queryFn: () => marketingOsApi.templates(debounced),
    staleTime: 10 * 60 * 1000,
  });
  const rows: Template[] = tq.data ?? [];

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search: TikTok ads, launch, email…"
          aria-label="Search templates"
          className="pl-9"
        />
      </div>

      {tq.isLoading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nothing matches &ldquo;{debounced}&rdquo;. Try a broader word, or just describe what you need in the
          console.
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {rows.map((t) => (
            <div key={t.id} className="flex flex-col gap-2 rounded-xl border p-4">
              <p className="font-medium">{t.title}</p>
              <p className="text-sm text-muted-foreground line-clamp-3 whitespace-pre-wrap">{t.template}</p>
              <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                <span className="text-xs text-muted-foreground">{t.category}</span>
                <Button size="sm" variant="outline" onClick={() => onUse(t.template)}>
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
