const publicPrefixes = ["/", "/sign-in", "/sign-up", "/login"];
const protectedPrefixes = ["/dashboard", "/search", "/analytics", "/reports", "/repo"];

export function resolveRouteAccess(input: { pathname: string; isAuthenticated: boolean }) {
  const { pathname, isAuthenticated } = input;

  if (pathname.startsWith("/api/auth")) {
    return { action: "allow" as const };
  }

  if (publicPrefixes.includes(pathname)) {
    return { action: "allow" as const };
  }

  if (protectedPrefixes.some((prefix) => pathname.startsWith(prefix)) && !isAuthenticated) {
    return { action: "redirect" as const, location: "/sign-in" };
  }

  return { action: "allow" as const };
}
