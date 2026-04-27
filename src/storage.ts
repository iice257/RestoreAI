import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Account, AppPreferences, Project } from "./types";

const STATE_KEY = "restoreai.state.v1";

export type PersistedState = {
  account: Account;
  prefs: AppPreferences;
  projects: Project[];
};

export async function initializeDatabase() {
  return null;
}

export async function loadState(): Promise<PersistedState | null> {
  const value = await AsyncStorage.getItem(STATE_KEY);
  return value ? JSON.parse(value) : null;
}

export async function saveState(state: PersistedState) {
  await AsyncStorage.setItem(STATE_KEY, JSON.stringify(state));
}

export async function clearState() {
  await AsyncStorage.removeItem(STATE_KEY);
}
