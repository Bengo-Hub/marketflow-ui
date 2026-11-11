import { mainAsset, type CreativeVersion } from "@/lib/api/creative";

/** The brief's other approved video ads a boost can run beside its main video (budget optimiser). */
export function boostAlternatives(versions: CreativeVersion[], currentId: string): { assetId: string; label: string }[] {
  return versions
    .filter((v) => v.id !== currentId && v.kind === "video_ad" && v.status === "approved")
    .map((v) => ({ asset: mainAsset(v), v }))
    .filter((x) => x.asset?.kind === "video")
    .map((x) => ({ assetId: x.asset!.id, label: `Version ${x.v.version_no}` }));
}
