import { auth } from "@/auth";
import { resolveRouteAccess } from "@/lib/services";

export default auth((req) => {
  const { pathname, origin } = req.nextUrl;
  const access = resolveRouteAccess({
    pathname,
    isAuthenticated: Boolean(req.auth),
  });

  if (access.action === "redirect") {
    return Response.redirect(new URL(access.location, origin));
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
