import type { Account, EditStage, Project, SampleImageKey } from "../types";

type ProjectSeed = {
  id: string;
  title: string;
  year: string;
  sourceAsset: SampleImageKey;
  sourceUri?: string;
  createdAt?: string;
};

export function getActiveStage(project: Project) {
  return project.stages.find((stage) => stage.id === project.activeStageId) ?? project.stages[0];
}

export function formatDisplayDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function createProject(seed: ProjectSeed): Project {
  return {
    id: seed.id,
    title: seed.title,
    year: seed.year,
    favorite: false,
    sourceAsset: seed.sourceAsset,
    sourceUri: seed.sourceUri,
    activeStageId: "source",
    stages: [
      {
        id: "source",
        type: "source",
        title: "Original",
        subtitle: "Preserved source image",
        createdAt: seed.createdAt ?? new Date().toISOString(),
        outputAsset: seed.sourceAsset,
        outputUri: seed.sourceUri,
        settings: {},
        remoteState: "not_uploaded",
      },
    ],
    exports: [],
  };
}

export function createImportedProject(asset: SampleImageKey, now = Date.now()) {
  return createProject({
    id: `project-${now}`,
    title: asset === "family" ? "Family Portrait" : asset === "archive" ? "Main Street" : "Studio Portrait",
    year: asset === "archive" ? "1938" : "1946",
    sourceAsset: asset,
    createdAt: new Date(now).toISOString(),
  });
}

export function createLocalPhotoProject(sourceUri: string, fallbackAsset: SampleImageKey = "portrait", now = Date.now()) {
  return createProject({
    id: `project-${now}`,
    title: "Imported Photo",
    year: new Date(now).getFullYear().toString(),
    sourceAsset: fallbackAsset,
    sourceUri,
    createdAt: new Date(now).toISOString(),
  });
}

export function replaceProject(projects: Project[], nextProject: Project) {
  return projects.map((project) => (project.id === nextProject.id ? nextProject : project));
}

export function appendStage(project: Project, stage: EditStage): Project {
  return {
    ...project,
    activeStageId: stage.id,
    stages: [...project.stages, stage],
  };
}

export function appendExport(project: Project, exported: EditStage): Project {
  return {
    ...project,
    exports: [exported, ...project.exports],
  };
}

export function getRemainingCredits(account: Account) {
  return Math.max(account.creditsTotal - account.creditsUsed, 0);
}

export function hasAvailableCredits(account: Account) {
  return getRemainingCredits(account) > 0;
}

export function consumeCredit(account: Account): Account {
  return {
    ...account,
    creditsUsed: Math.min(account.creditsUsed + 1, account.creditsTotal),
  };
}
