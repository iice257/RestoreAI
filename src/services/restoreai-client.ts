import { appConfig, getMissingLiveConfig } from "../config/env";
import type { BillingClient, ImageWorkflowClient } from "./contracts";
import {
  authClient as mockAuthClient,
  billingClient as mockBillingClient,
  createDemoProject,
  defaultAccount,
  defaultPrefs,
  imageWorkflowClient as mockImageWorkflowClient,
} from "../mock-clients";
import { supabaseAuthClient } from "./supabase-auth-client";

export { createDemoProject, defaultAccount, defaultPrefs };

export const serviceReadiness = Object.freeze({
  environment: appConfig.environment,
  authMode: appConfig.authMode,
  billingMode: appConfig.billingMode,
  imageWorkflowMode: appConfig.imageWorkflowMode,
  missingLiveConfig: getMissingLiveConfig(),
  usingMockServices:
    appConfig.authMode === "mock" ||
    appConfig.billingMode === "mock" ||
    appConfig.imageWorkflowMode === "mock",
});

const unavailableBillingClient: BillingClient = {
  async upgrade() {
    return unavailable("Billing");
  },
  async cancel() {
    return unavailable("Billing");
  },
  async restorePurchases() {
    return unavailable("Billing");
  },
};

const unavailableImageWorkflowClient: ImageWorkflowClient = {
  async processStage() {
    return unavailable("Image workflow");
  },
  async exportStage() {
    return unavailable("Image workflow");
  },
};

export const authClient = appConfig.authMode === "mock" ? mockAuthClient : supabaseAuthClient;
export const billingClient = appConfig.billingMode === "mock" ? mockBillingClient : unavailableBillingClient;
export const imageWorkflowClient =
  appConfig.imageWorkflowMode === "mock" ? mockImageWorkflowClient : unavailableImageWorkflowClient;

function unavailable(serviceName: string): never {
  throw new Error(`${serviceName} is configured for live mode, but the live client is not wired yet.`);
}
