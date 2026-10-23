"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAdminTenants } from "@/hooks/use-admin";
import { StatusBadge } from "@/components/ui-kit";
import { apiClient } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, Pencil, Settings, Users } from "lucide-react";
import { toast } from "sonner";

const SUBSCRIPTIONS_URL = process.env.NEXT_PUBLIC_SUBSCRIPTIONS_URL || "https://pricingapi.codevertexafrica.com";
const MARKETFLOW_API_URL = process.env.NEXT_PUBLIC_API_URL || "https://marketflowapi.codevertexafrica.com";

type ServiceChargePlan = {
  id: string;
  code: string;
  name: string;
  description: string;
  charge_type: string;
  charge_value: number;
  min_charge?: number;
  max_charge?: number;
  applicable_services?: string[];
  is_active: boolean;
  is_default: boolean;
};

type Plan = {
  id: string;
  plan_code: string;
  name: string;
  description: string;
  base_price: number;
  billing_cycle: string;
  currency: string;
  tier_limits?: Record<string, any>;
};

type Tenant = {
  id: string;
  name: string;
  slug: string;
  plan_code?: string;
  plan_name?: string;
};

type EditChargeForm = {
  charge_value: number;
  min_charge: number | undefined;
  max_charge: number | undefined;
  is_active: boolean;
};

export default function PlatformBillingPage() {
  const qc = useQueryClient();

  // ---- State for inline editing of service charge plans ----
  const [editingCharge, setEditingCharge] = useState<ServiceChargePlan | null>(null);
  const [chargeForm, setChargeForm] = useState<EditChargeForm>({
    charge_value: 0,
    min_charge: undefined,
    max_charge: undefined,
    is_active: true,
  });

  // ---- State for tenant plan override ----
  const [overrideDialogOpen, setOverrideDialogOpen] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");

  // ---- Queries ----
  const { data: chargePlans, isLoading: chargesLoading } = useQuery<ServiceChargePlan[]>({
    queryKey: ["service-charge-plans"],
    queryFn: async () => {
      try {
        const r = await apiClient.get<{ data: ServiceChargePlan[] }>(
          `${SUBSCRIPTIONS_URL}/api/v1/service-charges/plans?service=marketflow`,
        );
        return r.data.data ?? [];
      } catch {
        return [];
      }
    },
  });

  const { data: plans, isLoading: plansLoading } = useQuery<Plan[]>({
    queryKey: ["subscription-plans"],
    queryFn: async () => {
      try {
        const r = await apiClient.get<{ data: Plan[] }>(`${SUBSCRIPTIONS_URL}/api/v1/plans?service=marketflow&active=true`);
        return r.data.data ?? [];
      } catch {
        return [];
      }
    },
  });

  const { data: tenants, isLoading: tenantsLoading } = useAdminTenants();

  // ---- Mutations ----
  const updateCharge = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: Partial<ServiceChargePlan> }) => {
      return apiClient.put(`${SUBSCRIPTIONS_URL}/api/v1/service-charges/plans/${id}`, body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["service-charge-plans"] });
      setEditingCharge(null);
      toast.success("Service charge plan updated");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to update service charge plan");
    },
  });

  const overridePlan = useMutation({
    mutationFn: async ({ tenantId, planId }: { tenantId: string; planId: string }) => {
      return apiClient.put(`${SUBSCRIPTIONS_URL}/api/v1/subscriptions/${tenantId}/plan`, {
        plan_id: planId,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-tenants"] });
      setOverrideDialogOpen(false);
      setSelectedTenantId(null);
      setSelectedPlanId("");
      toast.success("Tenant plan overridden successfully");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to override tenant plan");
    },
  });

  function openChargeEdit(plan: ServiceChargePlan) {
    setEditingCharge(plan);
    setChargeForm({
      charge_value: plan.charge_value,
      min_charge: plan.min_charge,
      max_charge: plan.max_charge,
      is_active: plan.is_active,
    });
  }

  function handleChargeSave() {
    if (!editingCharge) return;
    updateCharge.mutate({
      id: editingCharge.id,
      body: {
        charge_value: chargeForm.charge_value,
        min_charge: chargeForm.min_charge,
        max_charge: chargeForm.max_charge,
        is_active: chargeForm.is_active,
      },
    });
  }

  function openOverrideDialog(tenantId: string) {
    setSelectedTenantId(tenantId);
    setSelectedPlanId("");
    setOverrideDialogOpen(true);
  }

  function handleOverrideSave() {
    if (!selectedTenantId || !selectedPlanId) return;
    overridePlan.mutate({ tenantId: selectedTenantId, planId: selectedPlanId });
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Billing Configuration</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure service charges, AI credit pricing, and subscription plans for all MarketFlow tenants.
          Changes here affect every new campaign and billing cycle going forward.
        </p>
      </div>

      {/* Service Charge Plans */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-amber-500" />
          <h2 className="text-lg font-semibold">Service Charge Plans</h2>
        </div>
        {chargesLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
          </div>
        ) : (chargePlans ?? []).length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No MarketFlow service charge plans found. Run the subscriptions-api seed to create SC_MARKETFLOW_ADS and SC_MARKETFLOW_AI_CREDIT.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {(chargePlans ?? []).map((plan) => (
              <Card key={plan.id}>
                <CardHeader className="flex flex-row items-start justify-between pb-2">
                  <div>
                    <CardTitle className="text-base">{plan.name}</CardTitle>
                    <Badge variant="outline" className="mt-1 text-xs">{plan.code}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    {plan.is_default && (
                      <Badge className="bg-green-100 text-green-800 text-xs">Default</Badge>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openChargeEdit(plan)}
                    >
                      <Pencil className="mr-1 h-3 w-3" />
                      Edit
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p className="text-muted-foreground">{plan.description}</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Type:</span>{" "}
                      <span className="font-medium">{plan.charge_type}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Value:</span>{" "}
                      <span className="font-medium">
                        {plan.charge_type === "PERCENTAGE" ? `${plan.charge_value}%` : `KES ${plan.charge_value}`}
                      </span>
                    </div>
                    {plan.min_charge != null && (
                      <div>
                        <span className="text-muted-foreground">Min:</span>{" "}
                        <span className="font-medium">KES {plan.min_charge}</span>
                      </div>
                    )}
                    {plan.max_charge != null && (
                      <div>
                        <span className="text-muted-foreground">Max:</span>{" "}
                        <span className="font-medium">KES {plan.max_charge}</span>
                      </div>
                    )}
                  </div>
                  <Badge variant={plan.is_active ? "default" : "outline"} className="text-xs">
                    {plan.is_active ? "Active" : "Inactive"}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Edit Service Charge Dialog */}
      <Dialog open={!!editingCharge} onOpenChange={(o) => { if (!o) setEditingCharge(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Service Charge: {editingCharge?.name}</DialogTitle>
          </DialogHeader>
          {editingCharge && (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                handleChargeSave();
              }}
            >
              <label className="block text-xs">
                <span className="mb-1 block font-medium text-muted-foreground">
                  Charge Value {editingCharge.charge_type === "PERCENTAGE" ? "(%)" : "(KES)"}
                </span>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={chargeForm.charge_value}
                  onChange={(e) => setChargeForm({ ...chargeForm, charge_value: Number(e.target.value) })}
                  required
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs">
                  <span className="mb-1 block font-medium text-muted-foreground">Min Charge (KES)</span>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    value={chargeForm.min_charge ?? ""}
                    onChange={(e) =>
                      setChargeForm({
                        ...chargeForm,
                        min_charge: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                  />
                </label>
                <label className="block text-xs">
                  <span className="mb-1 block font-medium text-muted-foreground">Max Charge (KES)</span>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    value={chargeForm.max_charge ?? ""}
                    onChange={(e) =>
                      setChargeForm({
                        ...chargeForm,
                        max_charge: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                  />
                </label>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={chargeForm.is_active}
                  onCheckedChange={(checked) =>
                    setChargeForm({ ...chargeForm, is_active: Boolean(checked) })
                  }
                />
                <span className="text-sm">{chargeForm.is_active ? "Active" : "Inactive"}</span>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditingCharge(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateCharge.isPending}>
                  {updateCharge.isPending ? "Saving..." : "Save changes"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Subscription Plans */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-amber-500" />
          <h2 className="text-lg font-semibold">Subscription Plans</h2>
        </div>
        {plansLoading ? (
          <Skeleton className="h-40 rounded-xl" />
        ) : (plans ?? []).length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No MarketFlow subscription plans found. Seed the <code>marketflow</code> product in subscriptions-api.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {(plans ?? []).map((plan) => (
              <Card key={plan.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{plan.name}</CardTitle>
                  <Badge variant="outline" className="text-xs">{plan.plan_code}</Badge>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <div className="text-xl font-bold">
                    {plan.base_price === 0 ? "Free" : `${plan.currency} ${plan.base_price.toLocaleString()}`}
                    {plan.billing_cycle !== "ONE_TIME" && plan.base_price > 0 && (
                      <span className="text-xs text-muted-foreground font-normal">
                        /{plan.billing_cycle.toLowerCase()}
                      </span>
                    )}
                  </div>
                  <p className="text-muted-foreground text-xs">{plan.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Tenant Subscriptions with Override */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-amber-500" />
          <h2 className="text-lg font-semibold">Tenant Subscriptions</h2>
        </div>
        {tenantsLoading ? (
          <Skeleton className="h-40 rounded-xl" />
        ) : (tenants ?? []).length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No tenants found. Tenants will appear here once they register on the platform.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-32"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(tenants ?? []).map((tenant) => (
                    <TableRow key={tenant.id}>
                      <TableCell className="font-medium">{tenant.name}</TableCell>
                      <TableCell className="text-muted-foreground">{tenant.slug}</TableCell>
                      <TableCell>
                        <StatusBadge status={tenant.status} />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openOverrideDialog(tenant.id)}
                        >
                          Override
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Override Plan Dialog */}
      <Dialog open={overrideDialogOpen} onOpenChange={setOverrideDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Override Tenant Plan</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              handleOverrideSave();
            }}
          >
            <div className="text-sm text-muted-foreground">
              Tenant: <span className="font-medium text-foreground">
                {tenants?.find((t) => t.id === selectedTenantId)?.name ?? selectedTenantId}
              </span>
            </div>
            <label className="block text-xs">
              <span className="mb-1 block font-medium text-muted-foreground">Select Plan</span>
              <Select value={selectedPlanId} onValueChange={(v) => setSelectedPlanId(v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a plan" />
                </SelectTrigger>
                <SelectContent>
                  {(plans ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.plan_code}) - {p.base_price === 0 ? "Free" : `${p.currency} ${p.base_price}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOverrideDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={overridePlan.isPending || !selectedPlanId}>
                {overridePlan.isPending ? "Saving..." : "Override Plan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
