"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { STALE_TIMES } from "@/app/providers";
import { accountsApi } from "@/lib/api/accounts";
import { Search } from "lucide-react";

type Account = {
  id: string;
  name: string;
  industry?: string;
  website?: string;
  contact_count?: number;
  created_at: string;
};

export default function AccountsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", industry: "", website: "" });

  const params: Record<string, string> = {};
  if (search) params.name = search;

  const { data, isLoading, error } = useQuery({
    queryKey: ["accounts", search],
    queryFn: () => accountsApi.list(params).then((r) => r.data),
    staleTime: STALE_TIMES.OPERATIONAL,
  });

  const createMutation = useMutation({
    mutationFn: (d: Record<string, unknown>) => accountsApi.create(d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      setShowCreate(false);
      setForm({ name: "", industry: "", website: "" });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Accounts</h1>
          <p className="text-muted-foreground">{data?.total ?? 0} total accounts</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>New Account</Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Search accounts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {search && (
          <Button variant="ghost" size="sm" onClick={() => setSearch("")}>
            Clear
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Failed to load accounts: {(error as Error).message}
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Industry</TableHead>
                <TableHead>Website</TableHead>
                <TableHead>Contacts</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-24" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (data?.data ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    No accounts yet. Add your first account to get started.
                  </TableCell>
                </TableRow>
              ) : (
                (data?.data ?? []).map((account: Account) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-medium">{account.name}</TableCell>
                    <TableCell>{account.industry ?? "--"}</TableCell>
                    <TableCell>
                      {account.website ? (
                        <a href={account.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                          {account.website}
                        </a>
                      ) : "--"}
                    </TableCell>
                    <TableCell>{account.contact_count ?? 0}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(account.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Account</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Name</label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Company name"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Industry</label>
              <Input
                value={form.industry}
                onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
                placeholder="e.g. Technology"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Website</label>
              <Input
                value={form.website}
                onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
                placeholder="https://example.com"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button
                onClick={() => createMutation.mutate({ name: form.name, industry: form.industry, website: form.website })}
                disabled={!form.name || createMutation.isPending}
              >
                Create
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
