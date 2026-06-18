const state = new Map<string, unknown>();

export function isSafeApplicationStateKey(key: string) {
  return /^[A-Za-z0-9_:.@/-]{1,160}$/.test(key);
}

export function hasApplicationState(key: string) {
  return state.has(key);
}

export function readApplicationState(key: string) {
  return state.get(key);
}

export function writeApplicationState(key: string, value: unknown) {
  state.set(key, value && typeof value === "object" ? value : {});
}

export function deleteApplicationState(key: string) {
  state.delete(key);
}
