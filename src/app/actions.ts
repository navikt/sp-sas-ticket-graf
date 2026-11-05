"use server";

import { revalidatePath } from "next/cache";
import { clearGitHubCache } from "@/lib/transport";

export async function refreshFromGitHub() {
  clearGitHubCache();
  revalidatePath("/", "layout");
}
