import { describe, expect, it } from "vitest";
import { releaseStatusLabel } from "./releaseStatusLabel.ts";

const t = ((key: string) => key) as unknown as Parameters<typeof releaseStatusLabel>[0];

describe("releaseStatusLabel", () => {
  it("returns null for null status", () => {
    expect(releaseStatusLabel(t, null)).toBeNull();
  });

  it("translates known statuses via i18n key", () => {
    expect(releaseStatusLabel(t, "returning")).toBe("series.releaseStatus.returning");
    expect(releaseStatusLabel(t, "in_production")).toBe("series.releaseStatus.in_production");
  });

  it("passes unknown/legacy strings through raw", () => {
    expect(releaseStatusLabel(t, "Some Legacy Value")).toBe("Some Legacy Value");
  });
});
