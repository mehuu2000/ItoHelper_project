// Call from a user gesture: requestFullscreen must run before the first await.
export async function requestLandscape({
  doc = globalThis.document,
  screen = globalThis.screen,
  isCurrent = () => true,
} = {}) {
  if (!isCurrent()) return { ok: false, reason: "cancelled" };

  const orientation = screen?.orientation;
  const previousFullscreen = doc?.fullscreenElement;
  const target = previousFullscreen || doc?.documentElement;
  if (
    !doc ||
    typeof orientation?.lock !== "function" ||
    typeof orientation?.unlock !== "function" ||
    (!previousFullscreen &&
      (!target ||
        doc.fullscreenEnabled === false ||
        typeof target.requestFullscreen !== "function" ||
        typeof doc.exitFullscreen !== "function"))
  ) {
    return { ok: false, reason: "unsupported" };
  }

  let enteredFullscreen = false;
  let fullscreenLost = false;
  let attemptedLock = false;
  const onFullscreenChange = () => {
    if (doc.fullscreenElement === target) {
      if (!previousFullscreen && !fullscreenLost) enteredFullscreen = true;
    } else if (previousFullscreen || enteredFullscreen) {
      fullscreenLost = true;
      enteredFullscreen = false;
    }
  };
  doc.addEventListener?.("fullscreenchange", onFullscreenChange);

  const cancelled = () =>
    !isCurrent() || fullscreenLost || doc.fullscreenElement !== target;
  const fail = async (reason) => {
    let cleanupFailed = false;
    if (attemptedLock) {
      try {
        await orientation.unlock();
      } catch {
        cleanupFailed = true;
      }
    }
    // Never close fullscreen that was present before this request, or a
    // replacement fullscreen session after the user has exited this one.
    if (enteredFullscreen && doc.fullscreenElement === target) {
      try {
        await doc.exitFullscreen();
      } catch {
        cleanupFailed = true;
      }
    }
    return {
      ok: false,
      reason,
      ...(cleanupFailed ? { cleanupFailed: true } : {}),
    };
  };

  try {
    if (!previousFullscreen) {
      try {
        await target.requestFullscreen();
      } catch {
        return await fail(isCurrent() ? "fullscreen" : "cancelled");
      }
      if (!fullscreenLost && doc.fullscreenElement === target) {
        enteredFullscreen = true;
      }
    }
    if (cancelled()) return await fail("cancelled");

    attemptedLock = true;
    try {
      await orientation.lock("landscape");
    } catch {
      return await fail(cancelled() ? "cancelled" : "lock");
    }
    if (cancelled()) return await fail("cancelled");
    return { ok: true };
  } finally {
    doc.removeEventListener?.("fullscreenchange", onFullscreenChange);
  }
}

export async function releaseLandscape({
  doc = globalThis.document,
  screen = globalThis.screen,
} = {}) {
  let ok = true;
  try {
    if (typeof screen?.orientation?.unlock === "function") {
      await screen.orientation.unlock();
    }
  } catch {
    ok = false;
  }
  if (doc?.fullscreenElement) {
    try {
      await doc.exitFullscreen();
    } catch {
      ok = false;
    }
  }
  return { ok };
}
