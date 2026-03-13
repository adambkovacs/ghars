"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { describeImportFailure } from "@/lib/server/portfolio/describe-import-failure";
import { getPortfolioRuntime } from "@/lib/server/portfolio/runtime";

export type ImportStarredReposActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  imported?: number;
};

export async function importStarredReposAction(): Promise<ImportStarredReposActionState>;
export async function importStarredReposAction(
  _previousState: ImportStarredReposActionState,
  _formData: FormData
): Promise<ImportStarredReposActionState>;
export async function importStarredReposAction(
  _previousState?: ImportStarredReposActionState,
  _formData?: FormData
): Promise<ImportStarredReposActionState> {
  void _previousState;
  void _formData;

  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  if (!session.accessToken) {
    return {
      status: "error",
      message: "GitHub access is missing from the current session. Sign out, sign back in, then try the import again.",
    };
  }

  try {
    const runtime = getPortfolioRuntime();
    const result = await runtime.importPortfolio({
      userId: session.user.id,
      githubUserId: session.user.id,
      githubLogin: session.githubLogin ?? session.user.name ?? session.user.id,
      accessToken: session.accessToken,
    });

    revalidatePath("/dashboard");
    revalidatePath("/search");
    revalidatePath("/analytics");
    revalidatePath("/reports");

    return {
      status: "success",
      message: `Imported ${result.imported} starred repos.`,
      imported: result.imported,
    };
  } catch (error) {
    console.error("Failed to import starred repos", error);
    return {
      status: "error",
      message: describeImportFailure(error),
    };
  }
}
