import { auth } from "@/auth";

const protectedPrefixes = ["/dashboard", "/search", "/analytics", "/reports", "/repo"];

const isAuthConfigured =
  Boolean(process.env.AUTH_GITHUB_ID) &&
  Boolean(process.env.AUTH_GITHUB_SECRET) &&
  Boolean(process.env.AUTH_SECRET);

export default auth((req) => {
  if (!isAuthConfigured) {
    return;
  }

  const { pathname, origin } = req.nextUrl;

  if (pathname.startsWith("/api/auth") || pathname.startsWith("/sign-in")) {
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
