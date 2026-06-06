import type { Account, AppPreferences, EditStage, Project, ToolType } from "../types";

export type AuthResult = {
  account: Account;
  notice?: string;
  requiresVerification?: boolean;
};

export type AuthClient = {
  signIn(email: string): Promise<AuthResult>;
  signOut(): Promise<Account>;
};

export type BillingClient = {
  upgrade(account: Account): Promise<Account>;
  cancel(account: Account): Promise<Account>;
  restorePurchases(account: Account): Promise<Account>;
};

export type ImageWorkflowClient = {
  processStage(
    project: Project,
    tool: ToolType,
    settings: EditStage["settings"],
    prefs: AppPreferences,
  ): Promise<EditStage>;
  exportStage(project: Project, format: AppPreferences["exportFormat"]): Promise<EditStage>;
};
