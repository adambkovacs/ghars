"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { RepoState } from "@/lib/domain/types";
import { getPortfolioRuntime } from "@/lib/server/portfolio/runtime";

export type RepoMutationActionState = {
  status: "idle" | "success" | "error";
  message?: string;
};

const validStates = new Set<RepoState>(["saved", "watching", "started", "parked"]);

export async function addRepoNoteAction(
  _previousState: RepoMutationActionState,
  formData: FormData
): Promise<RepoMutationActionState> {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const repoFullName = String(formData.get("repoFullName") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();

  if (!repoFullName || !content) {
    return {
      status: "error",
      message: "Add a note before submitting.",
    };
  }

  try {
    await getPortfolioRuntime().addNote({
      userId: session.user.id,
      repoFullName,
      content,
    });

    const [owner, name] = repoFullName.split("/");
    revalidatePath(`/repo/${owner}/${name}`);
    revalidatePath("/search");
    revalidatePath("/dashboard");
    revalidatePath("/analytics");
    revalidatePath("/reports");

    return {
      status: "success",
      message: "Note added to this repo.",
    };
  } catch (error) {
    console.error("Failed to add repo note", error);
    return {
      status: "error",
      message: "The note could not be saved. Try again.",
    };
  }
}

export async function changeRepoStateAction(
  _previousState: RepoMutationActionState,
  formData: FormData
): Promise<RepoMutationActionState> {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const repoFullName = String(formData.get("repoFullName") ?? "").trim();
  const nextState = String(formData.get("nextState") ?? "").trim() as RepoState;

  if (!repoFullName || !validStates.has(nextState)) {
    return {
      status: "error",
      message: "Choose a valid repo state.",
    };
  }

  try {
    await getPortfolioRuntime().changeRepoState({
      userId: session.user.id,
      repoFullName,
      nextState,
    });

    const [owner, name] = repoFullName.split("/");
    revalidatePath(`/repo/${owner}/${name}`);
    revalidatePath("/search");
    revalidatePath("/dashboard");
    revalidatePath("/analytics");
    revalidatePath("/reports");

    return {
      status: "success",
      message: `Repo moved to ${nextState}.`,
    };
  } catch (error) {
    console.error("Failed to change repo state", error);
    return {
      status: "error",
      message: "The repo state could not be updated. Try again.",
    };
  }
}
