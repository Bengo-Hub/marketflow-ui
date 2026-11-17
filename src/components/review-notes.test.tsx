import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ReviewNotes } from "./review-notes";

afterEach(cleanup);

describe("ReviewNotes", () => {
  it("lists each marketing-law note", () => {
    render(<ReviewNotes notes={["Urgency with no deadline behind it.", "A was price with no earlier price."]} />);
    expect(screen.getByText("Urgency with no deadline behind it.")).toBeTruthy();
    expect(screen.getByText("A was price with no earlier price.")).toBeTruthy();
  });

  it("renders nothing when there are no notes", () => {
    const { container } = render(<ReviewNotes notes={[]} />);
    expect(container.innerHTML).toBe("");
    const empty = render(<ReviewNotes notes={undefined} />);
    expect(empty.container.innerHTML).toBe("");
  });

  it("skips blank entries and shows at most ten", () => {
    const many = Array.from({ length: 14 }, (_, i) => `note ${i}`);
    render(<ReviewNotes notes={["  ", ...many]} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(10);
  });
});
