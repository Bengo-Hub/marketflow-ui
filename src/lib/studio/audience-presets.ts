/** Who a boost reaches, as simple presets (Sprint 18 L62). Meta does the finer targeting. */
export const AUDIENCE_PRESETS = [
  { value: "ke-all", label: "All of Kenya, 18 and over", countries: ["KE"], age_min: 18, age_max: undefined },
  { value: "ke-young", label: "Kenya, young adults 18 to 34", countries: ["KE"], age_min: 18, age_max: 34 },
  { value: "ke-working", label: "Kenya, working adults 25 to 54", countries: ["KE"], age_min: 25, age_max: 54 },
  { value: "east-africa", label: "Kenya, Uganda and Tanzania, 18 and over", countries: ["KE", "UG", "TZ"], age_min: 18, age_max: undefined },
] as const;

export type AudiencePreset = (typeof AUDIENCE_PRESETS)[number]["value"];

export function audienceFor(value: string): { countries: string[]; age_min?: number; age_max?: number } {
  const p = AUDIENCE_PRESETS.find((x) => x.value === value) ?? AUDIENCE_PRESETS[0];
  return { countries: [...p.countries], age_min: p.age_min, age_max: p.age_max };
}
