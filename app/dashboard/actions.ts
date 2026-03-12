"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getPortfolioRuntime } from "@/lib/server/portfolio/runtime";

export async function importStarredReposAction() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  if (!session.accessToken) {
    throw new Error("GitHub access token is missing from the current session.");
  }

  const runtime = getPortfolioRuntime();
  await runtime.importPortfolio({
    userId: session.user.id,
    githubUserId: session.user.id,
    githubLogin: session.githubLogin ?? session.user.name ?? session.user.id,
    accessToken: session.accessToken,
  });

  revalidatePath("/dashboard");
}
