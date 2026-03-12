import { describe, expect, it } from "vitest";
import { resolveRouteAccess } from "../../lib/services/resolveRouteAccess";

describe("resolveRouteAccess", () => {
  it("allows public routes for anonymous users", () => {
    expect(resolveRouteAccess({ pathname: "/", isAuthenticated: false })).toEqual({
      action: "allow",
    });
    expect(resolveRouteAccess({ pathname: "/sign-in", isAuthenticated: false })).toEqual({
      action: "allow",
    });
    expect(resolveRouteAccess({ pathname: "/login", isAuthenticated: false })).toEqual({
      action: "allow",
    });
  });

  it("redirects anonymous users away from protected routes", () => {
    expect(resolveRouteAccess({ pathname: "/dashboard", isAuthenticated: false })).toEqual({
      action: "redirect",
      location: "/sign-in",
    });
    expect(resolveRouteAccess({ pathname: "/repo/apify/crawlee", isAuthenticated: false })).toEqual({
      action: "redirect",
      location: "/sign-in",
    });
  });

  it("allows authenticated users onto protected routes", () => {
    expect(resolveRouteAccess({ pathname: "/dashboard", isAuthenticated: true })).toEqual({
      action: "allow",
    });
    expect(resolveRouteAccess({ pathname: "/search", isAuthenticated: true })).toEqual({
      action: "allow",
    });
  });
});
