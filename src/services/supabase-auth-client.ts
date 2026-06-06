import { appConfig } from "../config/env";
import type { Account } from "../types";
import type { AuthClient, AuthResult } from "./contracts";

const restoreAiRedirectUrl = "restoreai://auth/callback";

export const supabaseAuthClient: AuthClient = {
  async signIn(email: string): Promise<AuthResult> {
    const normalizedEmail = normalizeEmail(email);
    const config = getSupabaseAuthConfig();

    await requestEmailOtp(config, normalizedEmail);

    return {
      account: createPendingAccount(normalizedEmail),
      requiresVerification: true,
      notice:
        "Check your email for the RestoreAI sign-in link. This build now sends live Supabase Auth requests; the native callback confirmation screen is the next auth step.",
    };
  },
  async signOut(): Promise<Account> {
    return createSignedOutAccount();
  },
};

type SupabaseAuthConfig = {
  url: string;
  publishableKey: string;
};

function getSupabaseAuthConfig(): SupabaseAuthConfig {
  const supabaseUrl = appConfig.supabaseUrl;
  const supabasePublishableKey = appConfig.supabasePublishableKey;
  const missing: string[] = [];
  if (!supabaseUrl) missing.push("EXPO_PUBLIC_SUPABASE_URL");
  if (!supabasePublishableKey) missing.push("EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY");

  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error(`Supabase Auth is live, but missing ${missing.join(", ")}.`);
  }

  return {
    url: supabaseUrl.replace(/\/+$/, ""),
    publishableKey: supabasePublishableKey,
  };
}

async function requestEmailOtp(config: SupabaseAuthConfig, email: string) {
  const endpoint = `${config.url}/auth/v1/otp?redirect_to=${encodeURIComponent(restoreAiRedirectUrl)}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      apikey: config.publishableKey,
      Authorization: `Bearer ${config.publishableKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      create_user: true,
    }),
  });

  if (!response.ok) {
    throw new Error(await readSupabaseAuthError(response));
  }
}

async function readSupabaseAuthError(response: Response) {
  const fallback = `Supabase Auth request failed with HTTP ${response.status}.`;
  const text = await response.text().catch(() => "");
  if (!text) return fallback;

  try {
    const payload = JSON.parse(text) as Record<string, unknown>;
    const message =
      getString(payload.message) ??
      getString(payload.msg) ??
      getString(payload.error_description) ??
      getString(payload.error);

    return message ? `Supabase Auth: ${message}` : fallback;
  } catch {
    return fallback;
  }
}

function getString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function normalizeEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new Error("Enter a valid email address to continue.");
  }
  return normalized;
}

function createPendingAccount(email: string): Account {
  return {
    signedIn: false,
    name: "Pending verification",
    email,
    plan: "Free",
    creditsUsed: 0,
    creditsTotal: 20,
    renewsInDays: 30,
  };
}

function createSignedOutAccount(): Account {
  return {
    signedIn: false,
    name: "Guest",
    email: "demo@restoreai.local",
    plan: "Free",
    creditsUsed: 6,
    creditsTotal: 20,
    renewsInDays: 18,
  };
}
