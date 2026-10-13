import { SCHEMA_VERSION, validateState } from "./board-model.js";

// A new namespace deliberately leaves legacy/server-backed application data alone.
export const STORAGE_KEY = "ito-helper.local.v1";

function storageError(message, cause) {
  return new Error(message, cause ? { cause } : undefined);
}

function parseState(raw) {
  let state;
  try {
    state = JSON.parse(raw);
  } catch (error) {
    return {
      status: "corrupt",
      raw,
      error: storageError("Saved data is not valid JSON.", error),
    };
  }
  if (
    state &&
    typeof state === "object" &&
    Object.hasOwn(state, "schemaVersion") &&
    state.schemaVersion !== SCHEMA_VERSION
  ) {
    return {
      status: "unsupported",
      raw,
      error: storageError("This saved data uses an unsupported version."),
    };
  }
  const result = validateState(state);
  if (!result.valid) {
    return {
      status: "corrupt",
      raw,
      error: storageError(result.errors.join(" ")),
    };
  }
  return { status: "ready", state };
}

/** Read only: missing, blocked, malformed, and future data are never repaired in place. */
export function loadState(storage) {
  try {
    if (!storage || typeof storage.getItem !== "function") {
      return {
        status: "unavailable",
        error: storageError("Local storage is unavailable."),
      };
    }
    const raw = storage.getItem(STORAGE_KEY);
    if (raw === null) return { status: "empty" };
    if (typeof raw !== "string") {
      return {
        status: "corrupt",
        raw,
        error: storageError("Saved data must be text."),
      };
    }
    return parseState(raw);
  } catch (error) {
    return {
      status: "unavailable",
      error: storageError("Local storage could not be read.", error),
    };
  }
}

/** An explicit write. Refuse to overwrite unknown or corrupt existing data. */
export function saveState(storage, state) {
  try {
    const result = validateState(state);
    if (!result.valid)
      return { ok: false, error: storageError(result.errors.join(" ")) };
    const existing = loadState(storage);
    if (existing.status !== "ready" && existing.status !== "empty") {
      return { ok: false, error: existing.error };
    }
    if (typeof storage.setItem !== "function") {
      return {
        ok: false,
        error: storageError("Local storage cannot be written."),
      };
    }
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: storageError(
        "Local storage could not be saved. Export a backup before closing.",
        error,
      ),
    };
  }
}

/** Only call after user-confirmed recovery/import. Never clear unrelated keys. */
export function replaceStoredState(storage, state, options = {}) {
  try {
    const result = validateState(state);
    if (!result.valid)
      return { ok: false, error: storageError(result.errors.join(" ")) };
    if (
      !Object.hasOwn(options, "expectedRaw") ||
      (options.expectedRaw !== null && typeof options.expectedRaw !== "string")
    ) {
      return {
        ok: false,
        error: storageError(
          "Recovery requires the exact previously read data.",
        ),
      };
    }
    if (
      !storage ||
      typeof storage.getItem !== "function" ||
      typeof storage.setItem !== "function"
    ) {
      return {
        ok: false,
        error: storageError("Local storage is unavailable."),
      };
    }
    if (storage.getItem(STORAGE_KEY) !== options.expectedRaw) {
      return {
        ok: false,
        error: storageError(
          "Saved data changed. Review the current data before replacing it.",
        ),
      };
    }
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: storageError("Local storage could not be replaced.", error),
    };
  }
}

export function exportState(state) {
  const result = validateState(state);
  if (!result.valid) throw storageError(result.errors.join(" "));
  return JSON.stringify(state, null, 2);
}

/** Import returns a new validated value. It does not write or merge anything. */
export function importState(raw) {
  if (typeof raw !== "string")
    throw storageError("Import data must be JSON text.");
  const result = parseState(raw);
  if (result.status !== "ready") throw result.error;
  return result.state;
}
