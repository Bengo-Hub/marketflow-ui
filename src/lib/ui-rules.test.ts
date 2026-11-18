// The Studio UI rule (Sprint 15): no AI-look icons. A neutral icon says what a thing does
// (Repeat for the ad autopilot, PenLine for "write this field", Cpu for AI providers, Info for a
// note); Sparkles, Bot and BrainCircuit only say "AI".
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = resolve(process.cwd(), "src");
const BANNED = ["Sparkles", "Bot", "BrainCircuit"];
// studio/research belongs to the Sprint 24 research work, which removes its icon there.
const ALLOWED = new Set(["app/[orgSlug]/studio/research/page.tsx"]);

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return sources(p);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [p] : [];
  });
}

/** The lucide-react names a file imports. */
function lucideImports(code: string): string[] {
  const out: string[] = [];
  for (const m of code.matchAll(/import\s*\{([^}]*)\}\s*from\s*["']lucide-react["']/g)) {
    out.push(...m[1].split(",").map((s) => s.trim().split(/\s+as\s+/)[0]).filter(Boolean));
  }
  return out;
}

describe("UI rules", () => {
  it("imports no AI-look icons", () => {
    const offenders: string[] = [];
    for (const file of sources(SRC)) {
      const rel = relative(SRC, file).split("\\").join("/");
      if (ALLOWED.has(rel)) continue;
      const used = lucideImports(readFileSync(file, "utf8")).filter((n) => BANNED.includes(n));
      if (used.length) offenders.push(`${rel}: ${used.join(", ")}`);
    }
    expect(offenders).toEqual([]);
    // It reads every source file, which outlasts the 5 s default on a loaded machine.
  }, 60_000);

  it("reads lucide imports, aliases included", () => {
    expect(lucideImports('import { Bot, Play as Go } from "lucide-react";')).toEqual(["Bot", "Play"]);
  });
});
