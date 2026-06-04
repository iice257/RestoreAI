import { appConfig, getMissingLiveConfig } from "../config/env";
import {
  authClient as mockAuthClient,
  billingClient as mockBillingClient,
  createDemoProject,
  defaultAccount,
  defaultPrefs,
  imageWorkflowClient as mockImageWorkflowClient,
} from "../mock-clients";

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

// Live clients will plug in here once Supabase Auth, mobile billing, and the
// image-processing API are linked. Keeping this boundary explicit prevents mock
// behavior from leaking across the app as the MVP grows.
export const authClient = mockAuthClient;
export const billingClient = mockBillingClient;
export const imageWorkflowClient = mockImageWorkflowClient;

