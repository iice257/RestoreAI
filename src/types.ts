export type ToolType = "restore" | "upscale" | "extend" | "recolor";
export type StageType = "source" | ToolType | "export";
export type RemoteState =
  | "not_uploaded"
  | "consented"
  | "uploaded"
  | "processing"
  | "downloaded"
  | "deleting_remote"
  | "deleted"
  | "deletion_unavailable";

export type SampleImageKey = "portrait" | "family" | "archive";

export type EditStage = {
  id: string;
  type: StageType;
  title: string;
  subtitle: string;
  createdAt: string;
  sourceStageId?: string;
  outputAsset: SampleImageKey;
  settings: Record<string, string | number | boolean>;
  remoteState: RemoteState;
};

export type Project = {
  id: string;
  title: string;
  year: string;
  favorite: boolean;
  sourceAsset: SampleImageKey;
  activeStageId: string;
  stages: EditStage[];
  exports: EditStage[];
};

export type Account = {
  signedIn: boolean;
  name: string;
  email: string;
  plan: "Free" | "Archive Pro";
  creditsUsed: number;
  creditsTotal: number;
  renewsInDays: number;
};

export type AppPreferences = {
  onboardingComplete: boolean;
  privacyConsent: boolean;
  saveOriginals: boolean;
  deleteRemoteAfterProcessing: boolean;
  exportFormat: "JPEG" | "PNG" | "TIFF";
  offlineMode: boolean;
};
