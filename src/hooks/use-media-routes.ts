import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getFalPrices, getMediaRoutes, patchMediaRoutes } from "@/lib/api/media-routes";

/** The media tiers one provider card sets (fal or elevenlabs). */
export function useMediaRoutes(card: string) {
  return useQuery({ queryKey: ["media-routes", card], queryFn: () => getMediaRoutes(card) });
}

/** fal's prices for these endpoint ids (the server caches them a day). */
export function useFalPrices(ids: string[]) {
  return useQuery({
    queryKey: ["fal-prices", ids.join(",")],
    queryFn: () => getFalPrices(ids),
    enabled: ids.length > 0,
    staleTime: 60 * 60 * 1000,
  });
}

/** Saves one tier (merged server side; an empty value resets it to the default). */
export function useSaveMediaRoute(card: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: string; done: string }) => patchMediaRoutes({ [key]: value }),
    onSuccess: (rows) => qc.setQueryData(["media-routes", card], rows.filter((r) => r.card === card)),
  });
}
