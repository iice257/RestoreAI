import AsyncStorage from "@react-native-async-storage/async-storage";
import { decodeState, encodeState, STATE_KEY } from "./storage-codec";
import type { PersistableState, PersistedState } from "./storage-codec";

export async function initializeDatabase() {
  return null;
}

export async function loadState(): Promise<PersistedState | null> {
  const value = await AsyncStorage.getItem(STATE_KEY);
  return decodeState(value);
}

export async function saveState(state: PersistableState) {
  await AsyncStorage.setItem(STATE_KEY, encodeState(state));
}

export async function clearState() {
  await AsyncStorage.removeItem(STATE_KEY);
}
