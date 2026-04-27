import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SQLite from "expo-sqlite";
import type { Account, AppPreferences, Project } from "./types";

const STATE_KEY = "restoreai.state.v1";

export type PersistedState = {
  account: Account;
  prefs: AppPreferences;
  projects: Project[];
};

export async function initializeDatabase() {
  const db = await SQLite.openDatabaseAsync("restoreai.db");
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY NOT NULL,
      payload TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  return db;
}

export async function loadState(): Promise<PersistedState | null> {
  const value = await AsyncStorage.getItem(STATE_KEY);
  return value ? JSON.parse(value) : null;
}

export async function saveState(state: PersistedState) {
  await AsyncStorage.setItem(STATE_KEY, JSON.stringify(state));
  const db = await initializeDatabase();
  for (const project of state.projects) {
    await db.runAsync(
      "INSERT OR REPLACE INTO projects (id, payload, updated_at) VALUES (?, ?, ?)",
      project.id,
      JSON.stringify(project),
      new Date().toISOString(),
    );
  }
}

export async function clearState() {
  await AsyncStorage.removeItem(STATE_KEY);
  const db = await initializeDatabase();
  await db.execAsync("DELETE FROM projects;");
}
