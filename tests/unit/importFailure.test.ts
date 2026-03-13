import { describe, expect, it } from "vitest";
import { describeImportFailure } from "../../lib/server/portfolio/describe-import-failure";

describe("describeImportFailure", () => {
  it("maps GitHub 401 failures to a re-authentication message", () => {
    const message = describeImportFailure(new Error("GitHub GraphQL request failed with 401"));

    expect(message).toMatch(/sign out, sign back in with github/i);
  });

  it("maps GitHub 403 failures to a rate-limit message", () => {
    const message = describeImportFailure(new Error("GitHub GraphQL request failed with 403"));

    expect(message).toMatch(/rate limited/i);
  });

  it("falls back to the original error message for unknown failures", () => {
    const message = describeImportFailure(new Error("Unexpected upstream failure"));

    expect(message).toBe("Unexpected upstream failure");
  });
});
