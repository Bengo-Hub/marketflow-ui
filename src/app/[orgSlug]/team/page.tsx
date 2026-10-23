"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiError, marketingOsApi } from "@/lib/api/marketing-os";
import { ManagerConsole } from "@/components/marketing-os/manager-console";
import { TeamRoster } from "@/components/marketing-os/team-roster";
import { TemplateGallery } from "@/components/marketing-os/template-gallery";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Marketing OS: the owner talks to one Marketing Manager, who hands work to
 * specialists, quotes anything that costs credits, and shows drafts for review.
 * Nothing is posted or paid for from this page without an explicit approval.
 */
export default function MarketingTeamPage() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;
  const [tab, setTab] = useState("ask");
  const [draft, setDraft] = useState("");

  const teamQ = useQuery({ queryKey: ["os-team", orgSlug], queryFn: marketingOsApi.team, staleTime: 60_000 });
  const members = teamQ.data?.members ?? [];
  const manager = members.find((m) => m.key === "manager");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Marketing team</h1>
        <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
          Tell {manager?.name ?? "your Marketing Manager"} what you need in plain words. You see a quote before anything
          costs credits, and every draft waits for your approval. The team writes from your{" "}
          <Link href={`/${orgSlug}/settings/marketing-context`} className="underline underline-offset-2">
            brand context
          </Link>
          .
        </p>
      </div>

      {teamQ.error && (
        <div className="rounded border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {apiError(teamQ.error, "Could not load your marketing team")}
        </div>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab(String(v))}>
        <TabsList>
          <TabsTrigger value="ask">Ask</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="ask" className="pt-4">
          <ManagerConsole orgSlug={orgSlug} team={members} draft={draft} onDraftChange={setDraft} />
        </TabsContent>

        <TabsContent value="team" className="pt-4">
          {teamQ.isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-36 rounded-xl" />
              ))}
            </div>
          ) : (
            <TeamRoster orgSlug={orgSlug} members={members} />
          )}
        </TabsContent>

        <TabsContent value="templates" className="pt-4">
          <TemplateGallery
            onUse={(text) => {
              setDraft(text);
              setTab("ask");
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
