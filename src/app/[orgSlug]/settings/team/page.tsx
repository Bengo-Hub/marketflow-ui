"use client";

import { useState } from "react";
import { Check, Copy, Lock, Trash2, UserPlus, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { CapsuleTabs, ConfirmDialog, EmptyState, ErrorState, Field, PageHeader, StatusBadge, ToneBadge } from "@/components/ui-kit";
import { useInviteMember, useRemoveMember, useSetMemberRole, useTeam } from "@/hooks/use-team";
import { TEAM_ROLES, roleLabel, type InviteResult, type TeamMember, type TeamRole } from "@/lib/api/team";

const dateFmt = new Intl.DateTimeFormat("en-KE", { dateStyle: "medium" });
const ROLE_ITEMS = Object.fromEntries(TEAM_ROLES.map((r) => [r.value, r.label]));

function InviteForm({ onDone, onCreated }: { onDone: () => void; onCreated: (r: InviteResult) => void }) {
  const invite = useInviteMember();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<TeamRole>("fbo_owner");
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        invite.mutate({ email: email.trim(), name: name.trim() || undefined, role }, { onSuccess: (r) => (r.temp_password ? onCreated(r) : onDone()) });
      }}
    >
      <div className="space-y-4">
        <Field label="Email" required htmlFor="tm-e"><Input id="tm-e" type="email" inputMode="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label="Name" htmlFor="tm-n" hint="Shown on their account if they are new to Codevertex"><Input id="tm-n" value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Role" hint={TEAM_ROLES.find((r) => r.value === role)?.hint}>
          <CapsuleTabs label="Role" value={role} onChange={setRole} options={TEAM_ROLES.map((r) => ({ value: r.value, label: r.label }))} />
        </Field>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>Cancel</Button>
        <Button type="submit" disabled={!valid || invite.isPending}>{invite.isPending ? "Sending..." : "Send invite"}</Button>
      </DialogFooter>
    </form>
  );
}

function NewAccountNotice({ result, onDone }: { result: InviteResult; onDone: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <>
      <div className="space-y-3 text-sm">
        <p><span className="font-medium">{result.email}</span> did not have a Codevertex account, so one was made. They got an email with the sign-in link.</p>
        <p>Share this temporary password with them privately. It is shown only once, and they choose their own the first time they sign in.</p>
        <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/50 p-3">
          <code className="min-w-0 flex-1 truncate font-mono text-base tracking-wide">{result.temp_password}</code>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              void navigator.clipboard.writeText(result.temp_password ?? "");
              setCopied(true);
            }}
          >
            {copied ? <Check /> : <Copy />} {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      </div>
      <DialogFooter><Button onClick={onDone}>Done</Button></DialogFooter>
    </>
  );
}

export default function TeamPage() {
  const team = useTeam();
  const setRole = useSetMemberRole();
  const remove = useRemoveMember();
  const [inviting, setInviting] = useState(false);
  const [created, setCreated] = useState<InviteResult | null>(null);
  const [removing, setRemoving] = useState<TeamMember | null>(null);
  const members = team.data?.members ?? [];
  const canManage = !!team.data?.can_manage;

  const roleControl = (m: TeamMember) =>
    canManage && !m.you ? (
      <Select
        items={ROLE_ITEMS}
        value={m.roles[0] ?? null}
        onValueChange={(v) => v && v !== m.roles[0] && setRole.mutate({ id: m.id, role: v as TeamRole })}
      >
        <SelectTrigger className="h-10 w-32" aria-label={`Role for ${m.email}`}>
          <SelectValue placeholder="Pick a role" />
        </SelectTrigger>
        <SelectContent>
          {TEAM_ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
        </SelectContent>
      </Select>
    ) : (
      <ToneBadge tone={m.roles[0] === "marketflow_admin" ? "primary" : "neutral"}>{roleLabel(m.roles[0])}</ToneBadge>
    );

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<UsersRound />}
        title="Team"
        description="People who can sign in to MarketFlow for this business, and what each of them can do."
        actions={canManage && <Button onClick={() => setInviting(true)}><UserPlus /> Invite someone</Button>}
      />

      {team.data && !canManage && (
        <div className="glass flex items-start gap-3 rounded-[1.25rem] p-4 text-sm">
          <Lock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <p className="text-muted-foreground">Only an admin of this business can invite people, change roles or remove someone.</p>
        </div>
      )}

      <div className="glass overflow-hidden rounded-[1.25rem]">
        {team.isError && <div className="p-4"><ErrorState message="Could not load the team." onRetry={() => void team.refetch()} /></div>}
        {team.isLoading && <div className="space-y-2 p-4">{[0, 1, 2].map((i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-muted" />)}</div>}
        {!team.isLoading && !team.isError && members.length === 0 && (
          <EmptyState icon={<UsersRound />} title="Nobody here yet" description="People appear once they have signed in to MarketFlow at least once." />
        )}
        {members.length > 0 && (
          <ul className="divide-y divide-border">
            {members.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 p-4">
                <div className="flex min-w-0 flex-1 basis-56 items-center gap-3">
                  <div className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 font-display text-sm font-semibold text-primary">{m.email.slice(0, 1).toUpperCase()}</div>
                  <div className="min-w-0">
                    <p className="truncate font-medium" title={m.email}>
                      {m.email} {m.you && <span className="text-xs font-normal text-muted-foreground">(you)</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">Joined {dateFmt.format(new Date(m.created_at))}</p>
                  </div>
                </div>
                <div className="ml-13 flex items-center gap-2 sm:ml-0">
                  {m.status && m.status !== "active" && <StatusBadge status={m.status} />}
                  {roleControl(m)}
                  {canManage && !m.you && (
                    <Button variant="ghost" size="icon-sm" aria-label={`Remove ${m.email}`} onClick={() => setRemoving(m)}><Trash2 className="text-destructive" /></Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={inviting || !!created} onOpenChange={(o) => { if (!o) { setInviting(false); setCreated(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{created ? "Account created" : "Invite someone"}</DialogTitle></DialogHeader>
          {created ? (
            <NewAccountNotice result={created} onDone={() => setCreated(null)} />
          ) : (
            inviting && <InviteForm onDone={() => setInviting(false)} onCreated={(r) => { setInviting(false); setCreated(r); }} />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!removing}
        onOpenChange={(o) => !o && setRemoving(null)}
        title={`Remove ${removing?.email}?`}
        description="They can no longer use MarketFlow for this business. Their Codevertex account and access to other apps stay as they are."
        confirmLabel="Remove from team"
        pending={remove.isPending}
        onConfirm={() => removing && remove.mutate(removing.id, { onSuccess: () => setRemoving(null) })}
      />
    </div>
  );
}
