"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/api/errors";
import { shortLinksApi, type ShortLinkInput } from "@/lib/api/short-links";

export function useShortLinks(page: number, type: string) {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  return useQuery({
    queryKey: ["short-links", orgSlug, page, type],
    queryFn: () => shortLinksApi.list(page, type),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useCreateShortLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ShortLinkInput) => shortLinksApi.create(data),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["short-links"] }),
    onError: (e) => toast.error(apiErrorMessage(e, "Could not create the link")),
  });
}
