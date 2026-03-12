import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

const authSecret =
  process.env.AUTH_SECRET ??
  (process.env.NODE_ENV === "production" ? undefined : "ghars-dev-secret");

const githubConfigured =
  Boolean(process.env.AUTH_GITHUB_ID) &&
  Boolean(process.env.AUTH_GITHUB_SECRET) &&
  Boolean(authSecret);

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: authSecret,
  providers: githubConfigured ? [GitHub] : [],
  pages: {
    signIn: "/sign-in",
  },
});
