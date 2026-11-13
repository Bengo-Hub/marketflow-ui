"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { isBrandImagesRequired } from "@/lib/api/brand-images";
import { apiErrorMessage } from "@/lib/api/errors";
import { videoAdsApi, type EndCard, type VideoAdInput, type VideoScript } from "@/lib/api/video-ads";

/** The voices and deliveries a video ad can use; they change rarely. */
export function useVoices() {
  return useQuery({ queryKey: ["creative-voices"], queryFn: videoAdsApi.voices, staleTime: 10 * 60_000, retry: 1 });
}

/** The live price of rendering a script now (the scene cache counted) and the balance. */
export function useVideoAdQuote(versionId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["video-ad-quote", versionId],
    queryFn: () => videoAdsApi.quote(versionId),
    enabled,
    staleTime: 30_000,
    retry: false,
  });
}

/** Every action refreshes the brief, so its versions show the new state, and the quote. */
function useAction<A>(briefId: string, fn: (a: A) => Promise<unknown>, ok: string, fail: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      toast.success(ok);
      void qc.invalidateQueries({ queryKey: ["creative-brief", briefId] });
      void qc.invalidateQueries({ queryKey: ["video-ad-quote"] });
    },
    // Missing brand images are shown as a prompt with a link on the form (BrandImagesRequired).
    onError: (e) => {
      if (!isBrandImagesRequired(e)) toast.error(apiErrorMessage(e, fail));
    },
  });
}

export const useCreateVideoAd = (briefId: string) =>
  useAction(briefId, (d: VideoAdInput) => videoAdsApi.create(briefId, d), "Writing the script. It takes about a minute.", "Could not start the video ad");
export const useSaveScript = (briefId: string) =>
  useAction(
    briefId,
    ({ id, script, endCard }: { id: string; script?: VideoScript; endCard?: EndCard }) => videoAdsApi.saveScript(id, { script, end_card: endCard }),
    "Script saved",
    "Could not save the script",
  );
export const useMakeStoryboard = (briefId: string) =>
  useAction(briefId, videoAdsApi.storyboard, "Making the storyboard. It takes about a minute.", "Could not start the storyboard");
export const useApproveStoryboard = (briefId: string) =>
  useAction(briefId, videoAdsApi.approveStoryboard, "Storyboard approved", "Could not approve the storyboard");
export const useRenderVideoAd = (briefId: string) =>
  useAction(briefId, videoAdsApi.render, "Video started. A presenter ad takes about 5 to 10 minutes.", "Could not start the video");
export const useReviseVideoAd = (briefId: string) =>
  useAction(briefId, videoAdsApi.revision, "A copy of the script is ready to change. Unchanged scenes are reused.", "Could not start the change");
