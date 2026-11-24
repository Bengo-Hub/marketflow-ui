import { describe, expect, it } from "vitest";
import {
  emptyLeadFilterWords,
  leadFilterPatch,
  leadFilterProblems,
  leadFilterText,
  MAX_LEAD_FILTER_WORDS,
  parseLeadFilterWords,
  wordsAlreadyCovered,
} from "./lead-filter-settings";

describe("lead filter settings", () => {
  it("reads one word per line or comma separated, lower case and without repeats", () => {
    expect(parseLeadFilterWords("  Industrial   Placement \nGraduate trainee, graduate TRAINEE\n\n")).toEqual([
      "industrial placement",
      "graduate trainee",
    ]);
    expect(parseLeadFilterWords("")).toEqual([]);
  });

  it("shows the words one per line", () => {
    expect(leadFilterText(["a", "b c"])).toBe("a\nb c");
    expect(leadFilterText(undefined)).toBe("");
  });

  it("sends only the lists with words, or null to clear", () => {
    expect(leadFilterPatch(emptyLeadFilterWords())).toBeNull();
    expect(leadFilterPatch({ attachment: [], job: ["graduate trainee"], service_offer: [] })).toEqual({ job: ["graduate trainee"] });
  });

  it("stops a save over the API's limits", () => {
    const many = Array.from({ length: MAX_LEAD_FILTER_WORDS + 1 }, (_, i) => `word ${i}`);
    expect(leadFilterProblems({ ...emptyLeadFilterWords(), job: many })).toHaveLength(1);
    expect(leadFilterProblems({ ...emptyLeadFilterWords(), attachment: ["x".repeat(81)] })).toHaveLength(1);
    expect(leadFilterProblems({ ...emptyLeadFilterWords(), attachment: ["internship place"] })).toEqual([]);
  });

  it("finds the words the platform list already has", () => {
    expect(wordsAlreadyCovered(["internship", "graduate trainee"], ["internship", "vacancy"])).toEqual(["internship"]);
  });
});
