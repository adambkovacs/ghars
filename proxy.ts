import { auth } from "@/auth";

const protectedPrefixes = ["/dashboard", "/search", "/analytics", "/reports", "/repo"];

export default auth((req) => {
  const { pathname, origin } = req.nextUrl;

  if (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/sign-in") ||
    pathname.startsWith("/sign-up") ||
    pathname.startsWith("/login")
  ) {
    return;
  }

  if (protectedPrefixes.some((prefix) => pathname.startsWith(prefix)) && !req.auth) {
    return Response.redirect(new URL("/sign-in", origin));
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
