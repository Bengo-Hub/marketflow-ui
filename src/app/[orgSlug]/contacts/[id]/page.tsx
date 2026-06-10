"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { activitiesApi } from "@/lib/api/activities";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { STALE_TIMES } from "@/app/providers";
import { ArrowLeft, Mail, Phone, FileText, Calendar, Plus } from "lucide-react";

const lifecycleColors: Record<string, string> = {
  subscriber: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  lead: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  qualified: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  customer: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  evangelist: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};

const activityIcons: Record<string, React.ReactNode> = {
  email: <Mail className="h-4 w-4" />,
  call: <Phone className="h-4 w-4" />,
  note: <FileText className="h-4 w-4" />,
  meeting: <Calendar className="h-4 w-4" />,
};

type TimelineItem = {
  id: string;
  type: string;
  subject?: string;
  body?: string;
  direction?: string;
  created_at: string;
};

type Tab = "overview" | "timeline" | "360";

export default function ContactDetailPage() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;
  const id = params?.id as string;
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [showLog, setShowLog] = useState(false);
  const [form, setForm] = useState({ type: "note", subject: "", body: "" });

  const { data: contactData, isLoading: contactLoading, error: contactError } = useQuery({
    queryKey: ["contacts", id],
    queryFn: () => apiClient.get(`/api/v1/contacts/${id}`).then((r) => r.data),
    staleTime: STALE_TIMES.OPERATIONAL,
    enabled: !!id,
  });

  const { data: timelineData, isLoading: timelineLoading } = useQuery({
    queryKey: ["contacts", id, "timeline"],
    queryFn: () => activitiesApi.contactTimeline(id).then((r) => r.data),
    staleTime: STALE_TIMES.OPERATIONAL,
    enabled: !!id && activeTab === "timeline",
  });

  const { data: view360Data, isLoading: view360Loading } = useQuery({
    queryKey: ["contacts", id, "360"],
    queryFn: () => apiClient.get(`/api/v1/contacts/${id}/360`).then((r) => r.data),
    staleTime: STALE_TIMES.OPERATIONAL,
    enabled: !!id && activeTab === "360",
  });

  const logMutation = useMutation({
    mutationFn: (d: Record<string, unknown>) => activitiesApi.log(d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts", id, "timeline"] });
      setShowLog(false);
      setForm({ type: "note", subject: "", body: "" });
    },
  });

  const contact = contactData?.data ?? contactData;
  const timeline: TimelineItem[] = timelineData?.data ?? timelineData ?? [];
  const view360 = view360Data?.data ?? view360Data;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => window.location.href = `/${orgSlug}/contacts`}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Contacts
        </Button>
      </div>

      {contactError ? (
        <div className="rounded border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Failed to load contact: {(contactError as Error).message}
        </div>
      ) : contactLoading ? (
        <Card>
          <CardContent className="p-6 space-y-3">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardContent>
        </Card>
      ) : contact ? (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-xl font-bold">
                  {contact.first_name || contact.last_name
                    ? `${contact.first_name ?? ""} ${contact.last_name ?? ""}`.trim()
                    : "Unnamed Contact"}
                </h1>
                <p className="text-muted-foreground text-sm mt-0.5">{contact.email ?? "--"}</p>
              </div>
              {contact.lifecycle_stage && (
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${lifecycleColors[contact.lifecycle_stage] ?? "bg-gray-100 text-gray-700"}`}>
                  {contact.lifecycle_stage}
                </span>
              )}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Phone</span>
                <p className="font-medium mt-0.5">{contact.phone ?? "--"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Account</span>
                <p className="font-medium mt-0.5">{contact.account_name ?? "--"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Tabs */}
      <div className="flex border-b gap-1">
        {(["overview", "timeline", "360"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "360" ? "360° View" : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-sm font-semibold mb-3">Contact Details</h3>
            {contactLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-4 w-full" />)}
              </div>
            ) : contact ? (
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email</span>
                  <span>{contact.email ?? "--"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Phone</span>
                  <span>{contact.phone ?? "--"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Account</span>
                  <span>{contact.account_name ?? "--"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Lifecycle Stage</span>
                  <span>{contact.lifecycle_stage ?? "--"}</span>
                </div>
                {contact.created_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created</span>
                    <span>{new Date(contact.created_at).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No data available.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Timeline Tab */}
      {activeTab === "timeline" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setShowLog(true)}>
              <Plus className="mr-1 h-4 w-4" />
              Log Activity
            </Button>
          </div>
          <div className="space-y-3">
            {timelineLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Skeleton className="h-4 w-48 mb-2" />
                    <Skeleton className="h-3 w-full" />
                  </CardContent>
                </Card>
              ))
            ) : timeline.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No activities logged yet.
                </CardContent>
              </Card>
            ) : (
              timeline.map((item: TimelineItem) => (
                <Card key={item.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-full bg-muted p-2 text-muted-foreground">
                        {activityIcons[item.type] ?? <FileText className="h-4 w-4" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{item.subject ?? item.type}</span>
                          {item.direction && (
                            <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize">{item.direction}</span>
                          )}
                        </div>
                        {item.body && (
                          <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
                        )}
                        <p className="mt-1 text-xs text-muted-foreground">
                          {new Date(item.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {/* 360 View Tab */}
      {activeTab === "360" && (
        <div className="space-y-4">
          {view360Loading ? (
            <Card>
              <CardContent className="p-6 space-y-2">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-4 w-full" />)}
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-sm font-semibold mb-3">Orders</h3>
                  {view360?.orders?.length ? (
                    <div className="space-y-2">
                      {view360.orders.map((order: any) => (
                        <div key={order.id} className="flex justify-between text-sm">
                          <span>{order.id}</span>
                          <span className="text-muted-foreground">{order.status}</span>
                          <span>{order.total != null ? `$${order.total}` : "--"}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No orders available.</p>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-sm font-semibold mb-3">Payments</h3>
                  {view360?.payments?.length ? (
                    <div className="space-y-2">
                      {view360.payments.map((payment: any) => (
                        <div key={payment.id} className="flex justify-between text-sm">
                          <span>{payment.id}</span>
                          <span className="text-muted-foreground">{payment.status}</span>
                          <span>{payment.amount != null ? `$${payment.amount}` : "--"}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No payments available.</p>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-sm font-semibold mb-3">Loyalty</h3>
                  {view360?.loyalty ? (
                    <div className="space-y-2 text-sm">
                      {Object.entries(view360.loyalty).map(([key, val]) => (
                        <div key={key} className="flex justify-between">
                          <span className="text-muted-foreground capitalize">{key.replace(/_/g, " ")}</span>
                          <span>{String(val)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No loyalty data available.</p>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      <Dialog open={showLog} onOpenChange={setShowLog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Log Activity</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Type</label>
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v ?? "note" }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="note">Note</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="call">Call</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Subject</label>
              <Input
                value={form.subject}
                onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                placeholder="Activity subject"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Notes</label>
              <textarea
                className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none min-h-[80px] focus:outline-none focus:ring-2 focus:ring-ring"
                value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                placeholder="Notes..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowLog(false)}>Cancel</Button>
              <Button
                onClick={() => logMutation.mutate({ type: form.type, entity_type: "contact", entity_id: id, subject: form.subject, body: form.body })}
                disabled={logMutation.isPending}
              >
                Log
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
