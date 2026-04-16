"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Member = {
  id: string;
  user_id: string;
  email: string;
  name?: string;
  roles: string[];
  status: string;
  created_at: string;
};

const ROLES = [
  { value: "owner", label: "Owner" },
  { value: "admin", label: "Admin" },
  { value: "member", label: "Member" },
  { value: "viewer", label: "Viewer" },
];

export default function TeamPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<{ email: string; role: string }>({ email: "", role: "member" });

  const { data, isLoading, error } = useQuery({
    queryKey: ["team"],
    queryFn: async () => {
      const r = await apiClient.get<{ data: Member[] }>(`/api/v1/tenant/members`);
      return r.data;
    },
  });

  const invite = useMutation({
    mutationFn: async (input: { email: string; role: string }) =>
      apiClient.post(`/api/v1/tenant/members/invite`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team"] });
      setOpen(false);
      setForm({ email: "", role: "member" });
    },
  });

  const changeRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) =>
      apiClient.put(`/api/v1/tenant/members/${id}`, { role }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["team"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/api/v1/tenant/members/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["team"] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Team</h1>
          <p className="text-sm text-muted-foreground">
            Invite team members and manage their roles on this tenant. Platform-level access is
            never granted here.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>+ Invite member</Button>
      </div>

      {error && (
        <div className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Team management is served by auth-api. If this endpoint is not yet provisioned for your
          tenant, invites will return a 404.
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-32"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-24" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : !data?.data?.length ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    Only you so far. Invite teammates to collaborate on leads, campaigns and KB.
                  </TableCell>
                </TableRow>
              ) : (
                data.data.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.name ?? m.email.split("@")[0]}</TableCell>
                    <TableCell>{m.email}</TableCell>
                    <TableCell>
                      <Select
                        value={m.roles?.[0] ?? "member"}
                        onValueChange={(v) => changeRole.mutate({ id: m.id, role: v ?? "member" })}
                      >
                        <SelectTrigger className="h-7 w-28 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES.map((r) => (
                            <SelectItem key={r.value} value={r.value}>
                              {r.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{m.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          if (confirm(`Remove ${m.email} from this tenant?`)) remove.mutate(m.id);
                        }}
                      >
                        Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite member</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              invite.mutate(form);
            }}
          >
            <label className="block text-xs">
              <span className="mb-1 block font-medium text-muted-foreground">Email</span>
              <Input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </label>
            <label className="block text-xs">
              <span className="mb-1 block font-medium text-muted-foreground">Role</span>
              <Select
                value={form.role}
                onValueChange={(v) => setForm({ ...form, role: v ?? "member" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={invite.isPending}>
                {invite.isPending ? "Sending…" : "Send invite"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
