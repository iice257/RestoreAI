import type { Account, AppPreferences, Project } from "./types";

export const STATE_KEY = "restoreai.state.v1";
export const STORAGE_SCHEMA_VERSION = 1;

export type PersistedState = {
  schemaVersion: number;
  account: Account;
  prefs: AppPreferences;
  projects: Project[];
};

export type PersistableState = Omit<PersistedState, "schemaVersion">;

export function encodeState(state: PersistableState) {
  return JSON.stringify({
    schemaVersion: STORAGE_SCHEMA_VERSION,
    ...state,
  });
}

export function decodeState(value: string | null): PersistedState | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as Partial<PersistedState>;
    if (!parsed || typeof parsed !== "object") return null;
    if (!parsed.account || !parsed.prefs || !Array.isArray(parsed.projects)) return null;

    return {
      schemaVersion: typeof parsed.schemaVersion === "number" ? parsed.schemaVersion : 0,
      account: parsed.account,
      prefs: parsed.prefs,
      projects: parsed.projects,
    };
  } catch {
    return null;
  }
}

