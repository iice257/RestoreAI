import type { Account } from "../types";

export function isSignedIn(account: Account) {
  return account.signedIn;
}

export function getSignInMessage(action: "import" | "process" | "export" | "tool") {
  if (action === "import") return "Sign in to import and protect your own photos.";
  if (action === "process") return "Sign in to run restorations and keep the timeline tied to your account.";
  if (action === "export") return "Sign in to save exports to your RestoreAI library.";
  return "Sign in to use RestoreAI tools with saved projects and credits.";
}

