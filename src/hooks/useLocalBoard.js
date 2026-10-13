import { useEffect, useRef, useState } from "react";
import { createEmptyState, validateState } from "../lib/board-model.js";
import {
  STORAGE_KEY,
  loadState,
  saveState,
  replaceStoredState,
} from "../lib/local-store.js";

function browserStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
function readStored(storage) {
  try {
    if (!storage) return { status: "unavailable", raw: undefined };
    const raw = storage.getItem(STORAGE_KEY);
    return { ...loadState({ getItem: () => raw }), raw };
  } catch {
    return { status: "unavailable", raw: undefined };
  }
}
function initialState() {
  const storage = browserStorage();
  const loaded = readStored(storage);
  const usable = loaded.status === "ready" || loaded.status === "empty";
  return { storage, loaded, state: loaded.state ?? createEmptyState(), usable };
}

export function useLocalBoard() {
  const [initial] = useState(initialState);
  const [state, setState] = useState(initial.state);
  const [status, setStatus] = useState(initial.usable ? "saved" : "error");
  const [issue, setIssue] = useState(
    initial.usable ? null : initial.loaded.status,
  );
  const storage = useRef(initial.storage);
  const stateRef = useRef(initial.state);
  const baselineRaw = useRef(initial.loaded.raw);
  const blocked = useRef(!initial.usable);
  const pending = useRef(null);

  function fail(kind, block = true) {
    if (block) blocked.current = true;
    setIssue(kind);
    setStatus("error");
    return false;
  }
  function persist(next) {
    if (blocked.current) {
      setStatus("error");
      return false;
    }
    const latest = readStored(storage.current);
    if (latest.status !== "ready" && latest.status !== "empty")
      return fail(latest.status);
    // Compare the actual value last loaded/written, rather than trusting a delayed storage event.
    if (latest.raw !== baselineRaw.current) return fail("conflict");
    const result = saveState(storage.current, next);
    if (!result.ok) return fail("write", false);
    baselineRaw.current = JSON.stringify(next);
    setStatus("saved");
    setIssue(null);
    return true;
  }
  function flush() {
    if (pending.current !== null) {
      clearTimeout(pending.current);
      pending.current = null;
      return persist(stateRef.current);
    }
    return !blocked.current && status === "saved";
  }
  function update(change, options = {}) {
    const next =
      typeof change === "function" ? change(stateRef.current) : change;
    if (next === stateRef.current)
      return {
        changed: false,
        saved: !blocked.current && status === "saved",
        state: next,
      };
    clearTimeout(pending.current);
    pending.current = null;
    stateRef.current = next;
    setState(next);
    if (options.defer) {
      setStatus(blocked.current ? "error" : "saving");
      pending.current = setTimeout(() => {
        pending.current = null;
        persist(stateRef.current);
      }, 200);
      return { changed: true, saved: false, state: next };
    }
    return { changed: true, saved: persist(next), state: next };
  }
  function currentRaw() {
    return readStored(storage.current).raw;
  }
  function replace(next, expectedRaw) {
    clearTimeout(pending.current);
    pending.current = null;
    storage.current = browserStorage();
    const result = replaceStoredState(storage.current, next, { expectedRaw });
    if (result.ok) {
      blocked.current = false;
      baselineRaw.current = JSON.stringify(next);
      stateRef.current = next;
      setState(next);
      setIssue(null);
      setStatus("saved");
      return true;
    }
    const latest = readStored(storage.current);
    if (latest.status !== "ready" && latest.status !== "empty")
      return fail(latest.status);
    if (latest.raw !== expectedRaw) return fail("conflict");
    return fail("write", false);
  }
  function importReplacement(next, expectedRaw) {
    if (!validateState(next).valid) return { loaded: false, saved: false };
    if (replace(next, expectedRaw)) return { loaded: true, saved: true };
    const latest = readStored(storage.current);
    // A changed destination still needs a new confirmation. A storage failure may
    // leave the confirmed backup visible in memory without touching saved data.
    if (latest.raw !== expectedRaw) return { loaded: false, saved: false };
    baselineRaw.current = latest.raw;
    blocked.current = true;
    stateRef.current = next;
    setState(next);
    setStatus("error");
    return { loaded: true, saved: false };
  }
  function reload() {
    clearTimeout(pending.current);
    pending.current = null;
    storage.current = browserStorage();
    const loaded = readStored(storage.current);
    if (loaded.status === "ready" || loaded.status === "empty") {
      const next = loaded.state ?? createEmptyState();
      blocked.current = false;
      baselineRaw.current = loaded.raw;
      stateRef.current = next;
      setState(next);
      setIssue(null);
      setStatus("saved");
      return true;
    }
    return fail(loaded.status);
  }
  function retry() {
    // Conflicts and unreadable formats require explicit reload or guarded replacement.
    if (
      blocked.current &&
      ["conflict", "corrupt", "unsupported"].includes(issue)
    )
      return false;
    storage.current = browserStorage();
    const latest = readStored(storage.current);
    if (latest.status !== "ready" && latest.status !== "empty")
      return fail(latest.status);
    if (baselineRaw.current === undefined && latest.raw === null)
      baselineRaw.current = null;
    if (latest.raw !== baselineRaw.current) return fail("conflict");
    blocked.current = false;
    return persist(stateRef.current);
  }

  useEffect(() => {
    const onStorage = (event) => {
      if (
        event.storageArea !== storage.current ||
        (event.key !== STORAGE_KEY && event.key !== null)
      )
        return;
      clearTimeout(pending.current);
      pending.current = null;
      blocked.current = true;
      setIssue("conflict");
      setStatus("error");
    };
    const onLeave = () => {
      if (pending.current !== null) {
        clearTimeout(pending.current);
        pending.current = null;
        if (!blocked.current) persist(stateRef.current);
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") onLeave();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("pagehide", onLeave);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      onLeave();
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("pagehide", onLeave);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);
  return {
    state,
    status,
    issue,
    update,
    flush,
    currentRaw,
    replace,
    importReplacement,
    reload,
    retry,
  };
}
