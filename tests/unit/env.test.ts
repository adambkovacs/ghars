import { describe, expect, it } from "vitest";
import { cleanEnvValue } from "@/lib/env/normalize";

describe("cleanEnvValue", () => {
  it("trims surrounding whitespace and newlines", () => {
    expect(cleanEnvValue("  https://mellow-rat-924.convex.cloud\n")).toBe(
      "https://mellow-rat-924.convex.cloud"
    );
  });

  it("returns undefined for empty values", () => {
    expect(cleanEnvValue("   \n\t")).toBeUndefined();
    expect(cleanEnvValue(undefined)).toBeUndefined();
  });
});
