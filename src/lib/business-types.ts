/**
 * Business types an owner can pick (Sprint 7 #32). The list and each type's compliance rules live
 * in marketflow-ai; marketflow-api serves the list at GET /api/v1/tenant/profile/business-types, so
 * this file only orders, labels and diffs it and never keeps its own copy.
 */
export interface BusinessTypeOption {
  key: string;
  label: string;
  description: string;
  /** Set and removed by a platform admin only (Forever Living, owner 2026-11-14). */
  admin_only?: boolean;
}

export const GENERIC_BUSINESS_TYPE = "generic";
export const FLP_BUSINESS_TYPE = "flp";

/** Tenant metadata key marketflow-api sets when a type is saved; a chosen type is final in chat. */
export const BUSINESS_TYPE_CHOSEN_KEY = "business_type_chosen_at";

/** Picker order: the API's order, with "Other business" (generic) last. */
export function pickerOrder(list: BusinessTypeOption[]): BusinessTypeOption[] {
  const rest = list.filter((t) => t.key !== GENERIC_BUSINESS_TYPE);
  const generic = list.filter((t) => t.key === GENERIC_BUSINESS_TYPE);
  return [...rest, ...generic];
}

/** The types an owner may pick: admin-only types (Forever Living) are hidden. */
export function ownerChoices(list: BusinessTypeOption[]): BusinessTypeOption[] {
  return pickerOrder(list).filter((t) => !t.admin_only);
}

/** True when the stored type is admin-only, so the owner sees it read-only. */
export function isAdminOnlyType(list: BusinessTypeOption[] | undefined, key: string | null | undefined): boolean {
  const k = (key ?? "").trim().toLowerCase();
  if (k === FLP_BUSINESS_TYPE) return true;
  return !!list?.find((t) => t.key === k)?.admin_only;
}

/** The label for a stored key; an unknown or empty key reads as "Other business" or a tidy key. */
export function businessTypeLabel(list: BusinessTypeOption[] | undefined, key: string | null | undefined): string {
  const k = (key ?? "").trim().toLowerCase() || GENERIC_BUSINESS_TYPE;
  const hit = list?.find((t) => t.key === k);
  if (hit) return hit.label;
  if (k === GENERIC_BUSINESS_TYPE) return "Other business";
  if (k === FLP_BUSINESS_TYPE) return "Forever Living";
  return k.charAt(0).toUpperCase() + k.slice(1).replace(/[-_]+/g, " ");
}

/** Whether the owner (or an admin) ever saved a type for this tenant. */
export function businessTypeChosen(metadata: Record<string, unknown> | undefined | null): boolean {
  const v = metadata?.[BUSINESS_TYPE_CHOSEN_KEY];
  return typeof v === "string" && v !== "";
}

/**
 * The picker's starting value: the saved type, except a "generic" type nobody chose yet, which
 * starts with nothing selected so saving the form does not quietly make "Other business" final.
 */
export function initialBusinessType(saved: string | null | undefined, chosen: boolean): string {
  const s = (saved ?? "").trim();
  if (!chosen && (s === "" || s === GENERIC_BUSINESS_TYPE)) return "";
  return s;
}

/**
 * The business_type to send on save: the picked key when it differs from the saved one, or when
 * the type was never chosen (an explicit "Other business" is final, owner 2026-11-14). Nothing is
 * sent when nothing is picked or the stored type is admin-only, so a profile save never fails on
 * a type the owner cannot change.
 */
export function changedBusinessType(
  saved: string | null | undefined,
  picked: string | null | undefined,
  alreadyChosen = true,
): string | undefined {
  const p = (picked ?? "").trim();
  const s = (saved ?? "").trim();
  if (!p || s === FLP_BUSINESS_TYPE || p === FLP_BUSINESS_TYPE) return undefined;
  if (p !== s) return p;
  return alreadyChosen ? undefined : p;
}
