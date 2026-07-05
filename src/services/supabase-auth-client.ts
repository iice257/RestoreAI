import * as Linking from "expo-linking";
import type { Session, User } from "@supabase/supabase-js";
import { getRestoreAiSupabaseClient } from "./supabase-client";
import type { Account } from "../types";
import type { AuthClient, AuthResult } from "./contracts";

export const supabaseAuthClient: AuthClient = {
  async signIn(email: string): Promise<AuthResult> {
    const normalizedEmail = normalizeEmail(email);
    const supabase = getRestoreAiSupabaseClient();

    const existing = await supabase.auth.getSession();
    if (existing.data.session) {
      return {
        account: accountFromSession(existing.data.session),
        notice: "Existing RestoreAI session restored.",
      };
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        emailRedirectTo: getAuthRedirectUrl(),
      },
    });

    if (error) throw new Error(error.message);

    return {
      account: createPendingAccount(normalizedEmail),
      requiresVerification: true,
      notice:
        "Check your email for the RestoreAI sign-in link. This build can now complete the callback and persist the Supabase session.",
    };
  },
  async signOut(): Promise<Account> {
    const supabase = getRestoreAiSupabaseClient();
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
    return createSignedOutAccount();
  },
  async getCurrentAccount(): Promise<Account> {
    const supabase = getRestoreAiSupabaseClient();
    const { data, error } = await supabase.auth.getSession();
    if (error) throw new Error(error.message);
    return data.session ? accountFromSession(data.session) : createSignedOutAccount();
  },
  async handleAuthCallback(url: string): Promise<AuthResult | undefined> {
    const authParams = getAuthParams(url);
    if (!authParams) return undefined;

    const supabase = getRestoreAiSupabaseClient();
    let session: Session | null = null;

    if (authParams.error) {
      throw new Error(authParams.error);
    }

    if (authParams.code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(authParams.code);
      if (error) throw new Error(error.message);
      session = data.session;
    } else if (authParams.accessToken && authParams.refreshToken) {
      const { data, error } = await supabase.auth.setSession({
        access_token: authParams.accessToken,
        refresh_token: authParams.refreshToken,
      });
      if (error) throw new Error(error.message);
      session = data.session;
    }

    if (!session) return undefined;

    return {
      account: accountFromSession(session),
      notice: "Signed in with Supabase.",
    };
  },
};

type AuthParams = {
  accessToken?: string;
  refreshToken?: string;
  code?: string;
  error?: string;
};

export function getAuthRedirectUrl() {
  return Linking.createURL("auth/callback");
}

function getAuthParams(url: string): AuthParams | undefined {
  const params = new URLSearchParams();
  const [, queryAndHash = ""] = url.split("?");
  const [query = "", hashFromQuery = ""] = queryAndHash.split("#");
  const [, hashOnly = ""] = url.split("#");

  appendSearchParams(params, query);
  appendSearchParams(params, hashFromQuery || hashOnly);

  const accessToken = params.get("access_token") ?? undefined;
  const refreshToken = params.get("refresh_token") ?? undefined;
  const code = params.get("code") ?? undefined;
  const error = params.get("error_description") ?? params.get("error") ?? undefined;

  if (!accessToken && !refreshToken && !code && !error) return undefined;

  return { accessToken, refreshToken, code, error };
}

function appendSearchParams(target: URLSearchParams, value: string) {
  if (!value) return;
  const source = new URLSearchParams(value);
  source.forEach((paramValue, key) => target.set(key, paramValue));
}

function accountFromSession(session: Session): Account {
  return accountFromUser(session.user);
}

function accountFromUser(user: User): Account {
  const email = user.email ?? "verified@restoreai.local";
  const metadataName = getString(user.user_metadata?.full_name) ?? getString(user.user_metadata?.name);

  return {
    signedIn: true,
    name: metadataName ?? email.split("@")[0] ?? "Archivist",
    email,
    plan: "Free",
    creditsUsed: 0,
    creditsTotal: 20,
    renewsInDays: 30,
  };
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
