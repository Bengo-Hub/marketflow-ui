"use client";

import { useState } from "react";
import { Clapperboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui-kit";
import { useServiceConfig, useUpsertServiceConfig } from "@/hooks/use-admin";

/** A Creative Studio setting marketflow-api reads from service-config, with its documented fallback. */
export interface CreativeSetting {
  key: string;
  label: string;
  hint: string;
  fallback: string;
  validate?: (v: string) => string | null;
  /** A long value, such as JSON, edited in a text area. */
  multiline?: boolean;
}

/** Hours in a window: a number of hours ("72") or a Go duration in hours and minutes ("24h", "1h30m"). */
export function windowHours(v: string): number | null {
  const s = v.trim();
  if (/^\d+(\.\d+)?$/.test(s)) return parseFloat(s);
  const m = /^(?:(\d+)h)?(?:(\d+)m)?$/.exec(s);
  if (!m || (!m[1] && !m[2])) return null;
  return (m[1] ? parseInt(m[1], 10) : 0) + (m[2] ? parseInt(m[2], 10) / 60 : 0);
}

/** The API keeps the discard window between 1 hour and 30 days. */
export function validateDiscardWindow(v: string): string | null {
  if (!v.trim()) return null;
  const h = windowHours(v);
  if (h === null) return "Use hours like 24h or 72, or 1h30m.";
  if (h < 1 || h > 720) return "Between 1 hour and 30 days (720h).";
  return null;
}

const CONTACT_KINDS = ["whatsapp", "phone", "web", "email", "link"];

export function validateContacts(v: string): string | null {
  const bad = v
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s && !CONTACT_KINDS.includes(s));
  return bad.length ? `Unknown: ${bad.join(", ")}. Use ${CONTACT_KINDS.join(", ")}.` : null;
}

/** The landmark registry is a JSON object of areas, each with a list of landmarks. */
export function validateLandmarks(v: string): string | null {
  if (!v.trim()) return null;
  let reg: unknown;
  try {
    reg = JSON.parse(v);
  } catch {
    return "Not valid JSON.";
  }
  if (!reg || typeof reg !== "object" || Array.isArray(reg)) return 'Use an object keyed by area, like {"kisumu cbd": {...}}.';
  for (const [area, entry] of Object.entries(reg as Record<string, unknown>)) {
    const e = entry as { landmarks?: unknown };
    if (!e || typeof e !== "object" || !Array.isArray(e.landmarks) || e.landmarks.some((l) => typeof l !== "string")) {
      return `${area}: landmarks must be a list of descriptions.`;
    }
  }
  return null;
}

const BRANDING_KINDS = ["establishing", "presenter", "end_card"];

/** The in-scene branding rules: enabled, up to 3 scenes, known kinds and a logo width share of 0.05 to 0.3. */
export function validateBranding(v: string): string | null {
  if (!v.trim()) return null;
  let b: { enabled?: unknown; max_scenes?: unknown; kinds?: unknown; max_width?: unknown };
  try {
    b = JSON.parse(v);
  } catch {
    return "Not valid JSON.";
  }
  if (!b || typeof b !== "object" || Array.isArray(b)) return "Use an object like {\"enabled\": true}.";
  if (typeof b.enabled !== "boolean") return "enabled must be true or false.";
  if (b.max_scenes !== undefined && (typeof b.max_scenes !== "number" || b.max_scenes < 1 || b.max_scenes > 3)) return "max_scenes is 1 to 3.";
  if (b.kinds !== undefined && (!Array.isArray(b.kinds) || b.kinds.some((k) => !BRANDING_KINDS.includes(String(k))))) {
    return `kinds are ${BRANDING_KINDS.join(", ")}.`;
  }
  if (b.max_width !== undefined && (typeof b.max_width !== "number" || b.max_width < 0.05 || b.max_width > 0.3)) return "max_width is 0.05 to 0.3.";
  return null;
}

/** The real product screen rules: enabled and up to 4 scenes. */
export function validateScreens(v: string): string | null {
  if (!v.trim()) return null;
  let s: { enabled?: unknown; max_scenes?: unknown };
  try {
    s = JSON.parse(v);
  } catch {
    return "Not valid JSON.";
  }
  if (!s || typeof s !== "object" || Array.isArray(s) || typeof s.enabled !== "boolean") return "enabled must be true or false.";
  if (s.max_scenes !== undefined && (!Number.isInteger(s.max_scenes) || Number(s.max_scenes) < 1 || Number(s.max_scenes) > 4)) return "max_scenes is 1 to 4.";
  return null;
}

/** The local cues: short words with no digits, each with what it is printed on and the scenes it suits. */
export function validateLocalCues(v: string): string | null {
  if (!v.trim()) return null;
  let c: { enabled?: unknown; max_scenes?: unknown; cues?: unknown; marks?: unknown };
  try {
    c = JSON.parse(v);
  } catch {
    return "Not valid JSON.";
  }
  if (!c || typeof c !== "object" || Array.isArray(c) || typeof c.enabled !== "boolean") return "enabled must be true or false.";
  if (c.max_scenes !== undefined && c.max_scenes !== 1 && c.max_scenes !== 2) return "max_scenes is 1 or 2.";
  if (c.cues !== undefined && !Array.isArray(c.cues)) return "cues is a list.";
  for (const cue of (c.cues ?? []) as { match?: unknown; object?: unknown; text?: unknown }[]) {
    const text = String(cue?.text ?? "").trim();
    if (text.length < 2 || text.length > 20 || !/^\p{L}[\p{L} '&-]*$/u.test(text)) return `"${text}": use 2 to 20 letters, no numbers.`;
    if (!Array.isArray(cue.match) || cue.match.length === 0 || !String(cue.object ?? "").trim()) return `"${text}": give match words and an object.`;
  }
  if (c.marks !== undefined && (typeof c.marks !== "object" || c.marks === null || Object.values(c.marks).some((m) => typeof m !== "string"))) {
    return "marks maps a trade mark to neutral words.";
  }
  return null;
}

/** The brand face limits: enabled, up to 20 people and up to 1095 days. */
export function validateBrandFaces(v: string): string | null {
  if (!v.trim()) return null;
  let f: { enabled?: unknown; max_faces?: unknown; max_days?: unknown };
  try {
    f = JSON.parse(v);
  } catch {
    return "Not valid JSON.";
  }
  if (!f || typeof f !== "object" || Array.isArray(f) || typeof f.enabled !== "boolean") return "enabled must be true or false.";
  const within = (n: unknown, max: number) => n === undefined || (Number.isInteger(n) && Number(n) >= 1 && Number(n) <= max);
  if (!within(f.max_faces, 20)) return "max_faces is 1 to 20.";
  if (!within(f.max_days, 1095)) return "max_days is 1 to 1095.";
  return null;
}

export const CREATIVE_SETTINGS: CreativeSetting[] = [
  {
    key: "creative.discard_purge_after",
    label: "Discarded drafts are deleted after",
    hint: "A WhatsApp Discard keeps the draft this long in case the tap was a mistake. 24h when empty.",
    fallback: "24h",
    validate: validateDiscardWindow,
  },
  {
    key: "creative.cta_contacts",
    label: "Contacts on posters and end cards, in order",
    hint: "Drawn with their icons instead of a button. link is the offering's own page, else the website.",
    fallback: "whatsapp,phone,web",
    validate: validateContacts,
  },
  {
    key: "creative.logo_plate_style",
    label: "Plate behind the logo",
    hint: "auto picks a light plate for a dark logo and a dark one for a light logo, tinted by the brand colours. light, dark or none fix it.",
    fallback: "auto",
    validate: (v) => (v.trim() && !["auto", "light", "dark", "none"].includes(v.trim().toLowerCase()) ? "Use auto, light, dark or none." : null),
  },
  {
    key: "creative.logo_plate_opacity",
    label: "Logo plate opacity",
    hint: "From 0.5 to 1. 0.86 when empty.",
    fallback: "0.86",
    validate: (v) => {
      if (!v.trim()) return null;
      const n = Number(v);
      return Number.isFinite(n) && n >= 0.5 && n <= 1 ? null : "A number from 0.5 to 1.";
    },
  },
  {
    key: "creative.logo_every_scene",
    label: "Logo on every video scene",
    hint: "true lays the logo small in the calmer top corner of every scene; the end card always shows it in full.",
    fallback: "true",
    validate: (v) => (v.trim() && !["true", "false"].includes(v.trim().toLowerCase()) ? "Use true or false." : null),
  },
  {
    key: "creative.branding",
    label: "Logo in the scenes",
    hint: 'JSON: {"enabled": true, "max_scenes": 3, "kinds": ["establishing", "presenter", "end_card"], "max_width": 0.18}. The real logo is printed on a blank banner or wall panel in up to 3 key scenes, never on product close-ups, and only when the self-review passes it.',
    fallback: "",
    multiline: true,
    validate: validateBranding,
  },
  {
    key: "creative.screens",
    label: "Real app screens in the scenes",
    hint: 'JSON: {"enabled": true, "max_scenes": 2}. A scene showing a laptop, tablet, till or phone carries one of the tenant\'s own screenshots. Nothing happens for a tenant with none.',
    fallback: '{"enabled": true, "max_scenes": 2}',
    validate: validateScreens,
  },
  {
    key: "creative.brand_faces",
    label: "Brand faces",
    hint: 'JSON: {"enabled": true, "max_faces": 5, "max_days": 365}. enabled false stops every face at once; a tenant still has to opt in and record each person\'s consent.',
    fallback: '{"enabled": true, "max_faces": 5, "max_days": 365}',
    validate: validateBrandFaces,
  },
  {
    key: "creative.local_cues",
    label: "Local cues in the scenes",
    hint: 'JSON: {"enabled": true, "max_scenes": 1, "cues": [{"match": ["counter"], "object": "a small plain card on the counter", "text": "LIPA HAPA", "countries": ["KE"]}], "marks": {"m-pesa": "mobile money"}}. Words only, no numbers, up to 20 letters. Drawn only on the text routes in the media routing settings and kept only when the self-review reads them. marks are trade marks and the neutral words a drawn scene says instead.',
    fallback: "",
    multiline: true,
    validate: validateLocalCues,
  },
  {
    key: "creative.landmark_lookup",
    label: "Look up landmarks near the address",
    hint: "true lets the script writer read what the web says is near the business's address, once a week per tenant.",
    fallback: "true",
    validate: (v) => (v.trim() && !["true", "false"].includes(v.trim().toLowerCase()) ? "Use true or false." : null),
  },
  {
    key: "creative.landmarks",
    label: "Landmarks by town or area",
    hint: 'JSON keyed by area: {"kisumu cbd": {"aliases": ["kisumu"], "landmarks": ["..."], "look": "...", "street_life": "..."}}. Used for outdoor shots and backgrounds only. Empty keeps the built-in Kisumu CBD and Nairobi CBD entries.',
    fallback: "",
    multiline: true,
    validate: validateLandmarks,
  },
  {
    key: "creative.flp_default_address",
    label: "Default address for Forever Living sellers",
    hint: "Used only for an FLP tenant in Kenya that has not given its own address.",
    fallback: "Reinsurance Plaza, Nairobi CBD",
    validate: (v) => (v.trim().length > 200 ? "Up to 200 characters." : null),
  },
  {
    key: "creative.setting_pages",
    label: "Website pages read for the setting brief",
    hint: "Paths on the business's website, comma separated. The offering's own page is always read.",
    fallback: "/,/services,/about,/projects,/blog",
    validate: (v) => (v.split(",").some((p) => p.trim() && !p.trim().startsWith("/")) ? "Each path starts with /." : null),
  },
];

/** The Creative Studio's service-config settings as named fields, platform defaults or one tenant's overrides. */
export function CreativeSettingsCard({ tenantId }: { tenantId: string | null }) {
  const list = useServiceConfig(tenantId);
  const upsert = useUpsertServiceConfig(tenantId);
  // Unsaved edits by key; a field shows its stored value until it is edited.
  const [edits, setEdits] = useState<Record<string, string>>({});

  return (
    <section className="glass space-y-4 rounded-[1.25rem] p-4 sm:p-5" aria-labelledby="creative-settings">
      <div className="flex items-start gap-3">
        <Clapperboard className="mt-0.5 size-5 text-primary" aria-hidden />
        <div>
          <h2 id="creative-settings" className="text-base font-semibold">Creative Studio</h2>
          <p className="text-sm text-muted-foreground">
            {tenantId ? "Overrides for this tenant. Empty keeps the platform default." : "Platform defaults. A tenant override wins."}
          </p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {CREATIVE_SETTINGS.map((s) => {
          const stored = list.data?.find((c) => c.config_key === s.key)?.config_value ?? "";
          const value = edits[s.key] ?? stored;
          const error = s.validate?.(value) ?? null;
          return (
            <Field key={s.key} label={s.label} hint={s.hint} error={error} htmlFor={`cs-${s.key}`}>
              <div className="flex gap-2">
                {s.multiline ? (
                  <Textarea
                    id={`cs-${s.key}`}
                    value={value}
                    rows={6}
                    className="font-mono text-xs"
                    placeholder="Empty keeps the built-in default"
                    onChange={(e) => setEdits((v) => ({ ...v, [s.key]: e.target.value }))}
                  />
                ) : (
                  <Input
                    id={`cs-${s.key}`}
                    value={value}
                    placeholder={s.fallback}
                    onChange={(e) => setEdits((v) => ({ ...v, [s.key]: e.target.value }))}
                  />
                )}
                <Button
                  variant="outline"
                  disabled={!!error || value === stored || upsert.isPending}
                  onClick={() =>
                    upsert.mutate(
                      { key: s.key, value: value.trim(), description: s.label },
                      {
                        onSuccess: () =>
                          setEdits((v) => {
                            const next = { ...v };
                            delete next[s.key];
                            return next;
                          }),
                      },
                    )
                  }
                >
                  Save
                </Button>
              </div>
            </Field>
          );
        })}
      </div>
    </section>
  );
}
