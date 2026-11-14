/**
 * Navigation items that only one business type sees, such as Settings > PPB approvals for a
 * pharmacy (owner, 2026-11-14). An item without businessType is for everyone; an item with one is
 * hidden until the profile has loaded and shows that type.
 */
export interface BusinessTypeScoped {
  href: string;
  businessType?: string;
}

export function isBusinessType(current: string | undefined | null, want: string): boolean {
  return (current ?? "").trim().toLowerCase() === want;
}

export function filterByBusinessType<G extends { items: BusinessTypeScoped[] }>(groups: G[], businessType: string | undefined | null): G[] {
  return groups
    .map((g) => ({ ...g, items: g.items.filter((i) => !i.businessType || isBusinessType(businessType, i.businessType)) }))
    .filter((g) => g.items.length > 0);
}
