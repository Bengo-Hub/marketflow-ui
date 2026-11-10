import { describe, expect, it } from "vitest";
import { countByStatus, type DiscoveredEndpoint } from "./endpoints";

const e = (status: DiscoveredEndpoint["status"]): DiscoveredEndpoint => ({ method: "GET", path: "/x", status, first_seen: "", last_seen: "" });

describe("countByStatus", () => {
  it("counts every service's routes by status", () => {
    expect(
      countByStatus([
        { service: "ordering", endpoints: [e("candidate"), e("approved"), e("candidate")] },
        { service: "pos", endpoints: [e("rejected")] },
      ]),
    ).toEqual({ candidate: 2, approved: 1, rejected: 1 });
  });
  it("is all zero with no data", () => {
    expect(countByStatus(undefined)).toEqual({ candidate: 0, approved: 0, rejected: 0 });
  });
});
