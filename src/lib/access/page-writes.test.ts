import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PAGE_WRITES, pageWrites } from "./role-access";

const root = join(process.cwd(), "src/app/[orgSlug]");
/** Every page of the organisation area, as the part after /{orgSlug}; [id] stands for a detail page. */
const pages = readdirSync(root, { recursive: true, encoding: "utf8" })
  .map((f) => f.replaceAll("\\", "/"))
  .filter((f) => f === "page.tsx" || f.endsWith("/page.tsx"))
  .map((f) => `/${f.replace(/\/?page\.tsx$/, "")}`);

describe("PAGE_WRITES", () => {
  it("says who may change every page", () => {
    expect(pages.length).toBeGreaterThan(30);
    expect(pages.filter((p) => pageWrites(p) === undefined)).toEqual([]);
  });

  it("gives every settings page its own entry, so a new one is not missed", () => {
    expect(pages.filter((p) => p.startsWith("/settings") && !PAGE_WRITES[p])).toEqual([]);
  });

  it("names no page that is gone", () => {
    expect(Object.keys(PAGE_WRITES).filter((p) => !pages.includes(p))).toEqual([]);
  });

  it("follows the parent on a detail page", () => {
    expect(pageWrites("/leads/abc")).toBe("member");
    expect(pageWrites("/settings/lead-filter/")).toBe("form");
    expect(pageWrites("/leadsx")).toBe(undefined);
  });
});
