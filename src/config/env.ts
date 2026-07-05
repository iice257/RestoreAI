declare const process:
  | {
      env?: Record<string, string | undefined>;
    }
  | undefined;

export type AppEnvironment = "development" | "preview" | "production";
export type ServiceMode = "mock" | "live";

type PublicConfig = {
  environment: AppEnvironment;
  authMode: ServiceMode;
  billingMode: ServiceMode;
  imageWorkflowMode: ServiceMode;
  restoreAiApiUrl?: string;
  supabaseUrl?: string;
  supabasePublishableKey?: string;
  revenueCatIosApiKey?: string;
  revenueCatAndroidApiKey?: string;
  stripePublishableKey?: string;
};

const publicEnv = typeof process !== "undefined" && process?.env ? process.env : {};

function readEnv(key: string) {
  const value = publicEnv[key];
  return value && value.trim().length > 0 ? value.trim() : undefined;
}

function readEnvironment(): AppEnvironment {
  const value = readEnv("EXPO_PUBLIC_APP_ENV");
  if (value === "preview" || value === "production") return value;
  return "development";
}

function readServiceMode(key: string): ServiceMode {
  return readEnv(key) === "live" ? "live" : "mock";
}

export const appConfig: PublicConfig = Object.freeze({
  environment: readEnvironment(),
  authMode: readServiceMode("EXPO_PUBLIC_AUTH_MODE"),
  billingMode: readServiceMode("EXPO_PUBLIC_BILLING_MODE"),
  imageWorkflowMode: readServiceMode("EXPO_PUBLIC_IMAGE_WORKFLOW_MODE"),
  restoreAiApiUrl: readEnv("EXPO_PUBLIC_RESTOREAI_API_URL"),
  supabaseUrl: readEnv("EXPO_PUBLIC_SUPABASE_URL"),
  supabasePublishableKey: readEnv("EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
  revenueCatIosApiKey: readEnv("EXPO_PUBLIC_REVENUECAT_IOS_API_KEY"),
  revenueCatAndroidApiKey: readEnv("EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY"),
  stripePublishableKey: readEnv("EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY"),
});

export function getMissingLiveConfig() {
  const missing = new Set<string>();

  if (appConfig.authMode === "live") {
    if (!appConfig.supabaseUrl) missing.add("EXPO_PUBLIC_SUPABASE_URL");
    if (!appConfig.supabasePublishableKey) missing.add("EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  }

  if (appConfig.billingMode === "live") {
    if (!appConfig.restoreAiApiUrl) missing.add("EXPO_PUBLIC_RESTOREAI_API_URL");
    if (!appConfig.revenueCatIosApiKey && !appConfig.revenueCatAndroidApiKey && !appConfig.stripePublishableKey) {
      missing.add("EXPO_PUBLIC_REVENUECAT_IOS_API_KEY or EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY");
    }
  }

  if (appConfig.imageWorkflowMode === "live") {
    if (!appConfig.restoreAiApiUrl) missing.add("EXPO_PUBLIC_RESTOREAI_API_URL");
  }

  return Array.from(missing);
}

export function hasLiveConfigGaps() {
  return getMissingLiveConfig().length > 0;
}
