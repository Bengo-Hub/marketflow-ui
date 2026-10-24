"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { accountsApi, type AccountInput } from "@/lib/api/accounts";
import { apiErrorMessage } from "@/lib/api/errors";
import { segmentsApi, type SegmentRules } from "@/lib/api/segments";
import { rows } from "@/lib/api/types";
import type { Contact } from "@/lib/api/contacts";
import type { Segment } from "@/lib/api/segments";

export function useAccounts(page: number) {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  return useQuery({ queryKey: ["accounts", orgSlug, page], queryFn: () => accountsApi.list(page), placeholderData: keepPreviousData });
}

export function useAccountContacts(id: string | null) {
  return useQuery({ queryKey: ["account-contacts", id], queryFn: () => accountsApi.contacts(id!).then((b) => rows<Contact>(b)), enabled: !!id });
}

export function useSaveAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id?: string; data: AccountInput }) => (id ? accountsApi.update(id, data) : accountsApi.create(data)),
    onSuccess: (_a, v) => {
      toast.success(v.id ? "Account saved" : "Account added");
      void qc.invalidateQueries({ queryKey: ["accounts"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not save the account")),
  });
}

export function useRemoveAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => accountsApi.remove(id),
    onSuccess: () => {
      toast.success("Account deleted");
      void qc.invalidateQueries({ queryKey: ["accounts"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not delete the account")),
  });
}

export function useSegments() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  return useQuery({ queryKey: ["segments", orgSlug], queryFn: () => segmentsApi.list().then((r) => rows<Segment>(r.data)) });
}

export function useSaveSegment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name, rules }: { id?: string; name: string; rules: SegmentRules }) =>
      id ? segmentsApi.update(id, { name, filter_rules: rules }) : segmentsApi.create({ name, entity_type: "contact", filter_rules: rules, is_dynamic: true }),
    onSuccess: async (s, v) => {
      // Count the members straight away so the card shows a real number.
      const id = v.id ?? (s as Segment).id;
      if (id) await segmentsApi.evaluate(id).catch(() => undefined);
      toast.success(v.id ? "Segment saved" : "Segment created");
      void qc.invalidateQueries({ queryKey: ["segments"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not save the segment")),
  });
}

export function useSegmentAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "count" | "delete" }) => {
      if (action === "count") await segmentsApi.evaluate(id);
      else await segmentsApi.remove(id);
    },
    onSuccess: (_r, v) => {
      toast.success(v.action === "count" ? "Members recounted" : "Segment deleted");
      void qc.invalidateQueries({ queryKey: ["segments"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not update the segment")),
  });
}
