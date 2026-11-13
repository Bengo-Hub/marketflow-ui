"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field, ListEditor } from "@/components/ui-kit";
import {
  ACTOR_NAME_STYLES,
  MAX_ACTOR_NAME_LEN,
  MAX_ACTOR_NAMES,
  type ActorNameStyle,
  type BrandContext,
} from "@/lib/api/marketing-os";

const ANY = "any";
const STYLE_ITEMS: Record<string, string> = { [ANY]: "Let the writer choose", ...ACTOR_NAME_STYLES };

type Value = Pick<BrandContext, "actor_name_style" | "actor_names">;

/**
 * Which names people in the business's videos may use, so an ad never gives an actor a name the
 * business did not intend. Exact names win over the style.
 */
export function ActorNamesFields({ value, onChange, idPrefix = "an" }: { value: Value; onChange: (next: Value) => void; idPrefix?: string }) {
  const style = value.actor_name_style || ANY;
  const names = value.actor_names ?? [];
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Field label="Names for people in your videos" htmlFor={`${idPrefix}-style`} hint="The naming style actors in your ads follow.">
        <Select items={STYLE_ITEMS} value={style} onValueChange={(v) => v && onChange({ ...value, actor_name_style: v === ANY ? "" : (v as ActorNameStyle) })}>
          <SelectTrigger id={`${idPrefix}-style`} className="h-10 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.keys(STYLE_ITEMS).map((k) => (
              <SelectItem key={k} value={k}>
                {STYLE_ITEMS[k]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field
        label="Exact names you like"
        htmlFor={`${idPrefix}-names`}
        hint={`Optional, up to ${MAX_ACTOR_NAMES}, each up to ${MAX_ACTOR_NAME_LEN} characters. When you add names, videos use only these.`}
      >
        <ListEditor
          id={`${idPrefix}-names`}
          label="actor name"
          value={names}
          maxItems={MAX_ACTOR_NAMES}
          maxLength={MAX_ACTOR_NAME_LEN}
          placeholder="Achieng Yar Migori"
          onChange={(next) => onChange({ ...value, actor_names: next })}
        />
      </Field>
    </div>
  );
}
