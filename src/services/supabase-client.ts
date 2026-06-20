import "react-native-url-polyfill/auto";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, processLock, type SupabaseClient } from "@supabase/supabase-js";
import { AppState, Platform } from "react-native";
import { appConfig } from "../config/env";

let client: SupabaseClient | undefined;
let autoRefreshListenerStarted = false;

export function getRestoreAiSupabaseClient() {
  if (!client) {
    const config = getSupabaseConfig();
    client = createClient(config.url, config.publishableKey, {
      auth: {
        ...(Platform.OS !== "web" ? { storage: AsyncStorage } : {}),
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        lock: processLock,
      },
    });
  }

  startAutoRefreshListener(client);
  return client;
}

type SupabaseConfig = {
  url: string;
  publishableKey: string;
};

function getSupabaseConfig(): SupabaseConfig {
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

function startAutoRefreshListener(supabase: SupabaseClient) {
  if (Platform.OS === "web" || autoRefreshListenerStarted) return;
  autoRefreshListenerStarted = true;

  AppState.addEventListener("change", (state) => {
    if (state === "active") {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
