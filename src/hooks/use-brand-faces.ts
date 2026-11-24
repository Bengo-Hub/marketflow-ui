import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { brandFacesApi, type BrandFaceInput } from "@/lib/api/brand-faces";
import { apiErrorMessage } from "@/lib/api/errors";

const key = (orgSlug: string) => ["brand-faces", orgSlug] as const;

export function useBrandFaces() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  return useQuery({ queryKey: key(orgSlug), queryFn: brandFacesApi.list });
}

function useFaceAction<V>(fn: (v: V) => Promise<unknown>, fallback: string) {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    // Reload either way: a removal whose purge is still pending has already ended the consent.
    onSettled: () => void qc.invalidateQueries({ queryKey: key(orgSlug) }),
    onError: (e) => toast.error(apiErrorMessage(e, fallback)),
  });
}

export const useSwitchBrandFaces = () => useFaceAction((on: boolean) => brandFacesApi.switch(on), "Could not change brand faces");
export const useAddBrandFace = () => useFaceAction((input: BrandFaceInput) => brandFacesApi.add(input), "Could not record the consent");
export const useRemoveBrandFace = () => useFaceAction((id: string) => brandFacesApi.remove(id), "Could not remove the face");
