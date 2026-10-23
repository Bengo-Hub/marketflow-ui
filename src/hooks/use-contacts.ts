"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { contactsApi, type ContactUpdate } from "@/lib/api/contacts";
import { apiErrorMessage } from "@/lib/api/errors";

export function useContacts(params: { q?: string; contact_type?: string }, page: number) {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  return useQuery({
    queryKey: ["contacts", orgSlug, params, page],
    queryFn: () => contactsApi.list(params, page),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useContact360(id: string) {
  return useQuery({ queryKey: ["contact-360", id], queryFn: () => contactsApi.view360(id), enabled: !!id, staleTime: 30_000 });
}

export function useUpdateContact(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ContactUpdate) => contactsApi.update(id, body),
    onSuccess: () => {
      toast.success("Contact saved");
      void qc.invalidateQueries({ queryKey: ["contact-360", id] });
      void qc.invalidateQueries({ queryKey: ["contacts"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not save the contact")),
  });
}

export function useDeleteContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => contactsApi.remove(id),
    onSuccess: () => {
      toast.success("Contact deleted");
      void qc.invalidateQueries({ queryKey: ["contacts"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not delete the contact")),
  });
}

export function useMergeContacts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ survivorId, duplicateIds }: { survivorId: string; duplicateIds: string[] }) => contactsApi.merge(survivorId, duplicateIds),
    onSuccess: () => {
      toast.success("Contacts merged");
      void qc.invalidateQueries({ queryKey: ["contacts"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not merge the contacts")),
  });
}
