import type { Account, AppPreferences, EditStage, Project, ToolType } from "./types";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const defaultAccount: Account = {
  signedIn: false,
  name: "Guest",
  email: "demo@restoreai.local",
  plan: "Free",
  creditsUsed: 6,
  creditsTotal: 20,
  renewsInDays: 18,
};

export const defaultPrefs: AppPreferences = {
  onboardingComplete: false,
  privacyConsent: false,
  saveOriginals: true,
  deleteRemoteAfterProcessing: true,
  exportFormat: "JPEG",
  offlineMode: false,
};

export const authClient = {
  async signIn(email: string): Promise<Account> {
    await wait(350);
    return {
      signedIn: true,
      name: email.split("@")[0] || "Archivist",
      email,
      plan: "Free",
      creditsUsed: 6,
      creditsTotal: 20,
      renewsInDays: 18,
    };
  },
  async signOut(): Promise<Account> {
    await wait(150);
    return defaultAccount;
  },
};

export const billingClient = {
  async upgrade(account: Account): Promise<Account> {
    await wait(400);
    return { ...account, plan: "Archive Pro", creditsTotal: 120, renewsInDays: 30 };
  },
  async cancel(account: Account): Promise<Account> {
    await wait(300);
    return { ...account, plan: "Free", creditsTotal: 20 };
  },
  async restorePurchases(account: Account): Promise<Account> {
    await wait(300);
    return account.plan === "Archive Pro" ? account : { ...account, plan: "Archive Pro", creditsTotal: 120 };
  },
};

export const imageWorkflowClient = {
  async processStage(project: Project, tool: ToolType, settings: EditStage["settings"], prefs: AppPreferences) {
    if (prefs.offlineMode) throw new Error("Remote processing is unavailable while offline.");
    if (!prefs.privacyConsent) throw new Error("Processing needs upload consent first.");
    await wait(1000);
    const current = project.stages.find((stage) => stage.id === project.activeStageId) ?? project.stages[0];
    const titleMap: Record<ToolType, string> = {
      restore: "Restored",
      upscale: "Upscaled",
      extend: "Extended",
      recolor: "Recolored",
    };
    const subtitleMap: Record<ToolType, string> = {
      restore: "Scratch repair, fade recovery",
      upscale: "4096 px archive master",
      extend: "Portrait frame expanded",
      recolor: "Natural color pass",
    };
    const stage: EditStage = {
      id: `${tool}-${Date.now()}`,
      type: tool,
      title: titleMap[tool],
      subtitle: subtitleMap[tool],
      createdAt: new Date().toISOString(),
      sourceStageId: current.id,
      outputAsset: tool === "recolor" ? "family" : tool === "extend" ? "archive" : "portrait",
      settings,
      remoteState: prefs.deleteRemoteAfterProcessing ? "deleted" : "downloaded",
    };
    return stage;
  },
  async exportStage(project: Project, format: string) {
    await wait(450);
    const current = project.stages.find((stage) => stage.id === project.activeStageId) ?? project.stages[0];
    const stage: EditStage = {
      id: `export-${Date.now()}`,
      type: "export",
      title: `${format} Export`,
      subtitle: "Saved as a separate variant",
      createdAt: new Date().toISOString(),
      sourceStageId: current.id,
      outputAsset: current.outputAsset,
      settings: { format },
      remoteState: "not_uploaded",
    };
    return stage;
  },
};

export const createDemoProject = (): Project => ({
  id: "project-family-1946",
  title: "Family Portrait",
  year: "1946",
  favorite: false,
  sourceAsset: "portrait",
  activeStageId: "source",
  stages: [
    {
      id: "source",
      type: "source",
      title: "Original",
      subtitle: "Preserved source image",
      createdAt: new Date().toISOString(),
      outputAsset: "portrait",
      settings: {},
      remoteState: "not_uploaded",
    },
  ],
  exports: [],
});
