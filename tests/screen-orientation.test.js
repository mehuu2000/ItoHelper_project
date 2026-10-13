import test from "node:test";
import assert from "node:assert/strict";
import {
  requestLandscape,
  releaseLandscape,
} from "../src/lib/screen-orientation.js";

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

function fixture() {
  const calls = [];
  const listeners = new Set();
  const doc = {
    fullscreenElement: null,
    fullscreenEnabled: true,
    documentElement: {
      requestFullscreen() {
        calls.push("fullscreen");
        doc.fullscreenElement = this;
        change();
        return Promise.resolve();
      },
    },
    exitFullscreen() {
      calls.push("exit");
      doc.fullscreenElement = null;
      change();
      return Promise.resolve();
    },
    addEventListener(name, listener) {
      assert.equal(name, "fullscreenchange");
      listeners.add(listener);
    },
    removeEventListener(name, listener) {
      assert.equal(name, "fullscreenchange");
      listeners.delete(listener);
    },
  };
  const screen = {
    orientation: {
      lock(value) {
        calls.push(`lock:${value}`);
        return Promise.resolve();
      },
      unlock() {
        calls.push("unlock");
      },
    },
  };
  function change() {
    for (const listener of listeners) listener();
  }
  return { doc, screen, calls, listeners, change };
}

test("fullscreen starts synchronously, followed by landscape lock", async () => {
  const f = fixture();
  const result = requestLandscape(f);
  assert.deepEqual(f.calls, ["fullscreen"]);
  assert.deepEqual(await result, { ok: true });
  assert.deepEqual(f.calls, ["fullscreen", "lock:landscape"]);
  assert.equal(f.doc.fullscreenElement, f.doc.documentElement);
  assert.equal(f.listeners.size, 0);
});

test("missing required APIs never enter fullscreen", async () => {
  for (const alter of [
    (f) => (f.screen = undefined),
    (f) => (f.screen.orientation = undefined),
    (f) => (f.screen.orientation.lock = undefined),
    (f) => (f.screen.orientation.unlock = undefined),
    (f) => (f.doc.documentElement.requestFullscreen = undefined),
    (f) => (f.doc.exitFullscreen = undefined),
    (f) => (f.doc.fullscreenEnabled = false),
    (f) => (f.doc = null),
  ]) {
    const f = fixture();
    alter(f);
    assert.deepEqual(await requestLandscape(f), {
      ok: false,
      reason: "unsupported",
    });
    assert.deepEqual(f.calls, []);
    assert.equal(f.listeners.size, 0);
  }
});

test("fullscreen rejection never attempts a lock or unlock", async () => {
  for (const synchronous of [false, true]) {
    const f = fixture();
    f.doc.documentElement.requestFullscreen = () => {
      f.calls.push("fullscreen");
      if (synchronous) throw new Error("Denied");
      return Promise.reject(new Error("Denied"));
    };
    assert.deepEqual(await requestLandscape(f), {
      ok: false,
      reason: "fullscreen",
    });
    assert.deepEqual(f.calls, ["fullscreen"]);
    assert.equal(f.listeners.size, 0);
  }
});

test("lock rejection unlocks and rolls back newly entered fullscreen", async () => {
  for (const synchronous of [false, true]) {
    const f = fixture();
    f.screen.orientation.lock = () => {
      f.calls.push("lock");
      if (synchronous) throw new Error("Unsupported");
      return Promise.reject(new Error("Unsupported"));
    };
    assert.deepEqual(await requestLandscape(f), { ok: false, reason: "lock" });
    assert.deepEqual(f.calls, ["fullscreen", "lock", "unlock", "exit"]);
    assert.equal(f.doc.fullscreenElement, null);
    assert.equal(f.listeners.size, 0);
  }
});

test("preexisting fullscreen is reused and preserved on lock rejection", async () => {
  const f = fixture();
  const previous = {};
  f.doc.fullscreenElement = previous;
  f.screen.orientation.lock = () => Promise.reject(new Error("Denied"));
  assert.deepEqual(await requestLandscape(f), { ok: false, reason: "lock" });
  assert.deepEqual(f.calls, ["unlock"]);
  assert.equal(f.doc.fullscreenElement, previous);
});

test("preexisting fullscreen does not require a new fullscreen request", async () => {
  const f = fixture();
  f.doc.fullscreenElement = {};
  f.doc.documentElement.requestFullscreen = undefined;
  assert.deepEqual(await requestLandscape(f), { ok: true });
  assert.deepEqual(f.calls, ["lock:landscape"]);
});

test("a request already cancelled does not change browser state", async () => {
  const f = fixture();
  assert.deepEqual(
    await requestLandscape({ ...f, isCurrent: () => false }),
    { ok: false, reason: "cancelled" },
  );
  assert.deepEqual(f.calls, []);
});

test("cancellation while fullscreen is pending exits without attempting lock", async () => {
  const f = fixture();
  const pending = deferred();
  let current = true;
  f.doc.documentElement.requestFullscreen = () => pending.promise;
  const result = requestLandscape({ ...f, isCurrent: () => current });
  current = false;
  f.doc.fullscreenElement = f.doc.documentElement;
  pending.resolve();
  assert.deepEqual(await result, { ok: false, reason: "cancelled" });
  assert.deepEqual(f.calls, ["exit"]);
});

test("cancellation while lock is pending rolls back even after lock succeeds", async () => {
  const f = fixture();
  const pending = deferred();
  let current = true;
  f.screen.orientation.lock = () => {
    f.calls.push("lock");
    return pending.promise;
  };
  const result = requestLandscape({ ...f, isCurrent: () => current });
  await Promise.resolve();
  current = false;
  pending.resolve();
  assert.deepEqual(await result, { ok: false, reason: "cancelled" });
  assert.deepEqual(f.calls, ["fullscreen", "lock", "unlock", "exit"]);
});

test("external fullscreen exit before lock prevents claiming success", async () => {
  const f = fixture();
  const result = requestLandscape(f);
  f.doc.fullscreenElement = null;
  f.change();
  assert.deepEqual(await result, { ok: false, reason: "cancelled" });
  assert.deepEqual(f.calls, ["fullscreen"]);
});

test("external fullscreen exit during lock only unlocks on completion", async () => {
  const f = fixture();
  const pending = deferred();
  f.screen.orientation.lock = () => pending.promise;
  const result = requestLandscape(f);
  await Promise.resolve();
  f.doc.fullscreenElement = null;
  f.change();
  pending.resolve();
  assert.deepEqual(await result, { ok: false, reason: "cancelled" });
  assert.deepEqual(f.calls, ["fullscreen", "unlock"]);
});

test("a new fullscreen session after external exit is not closed by cleanup", async () => {
  const f = fixture();
  const pending = deferred();
  f.screen.orientation.lock = () => pending.promise;
  const result = requestLandscape(f);
  await Promise.resolve();
  f.doc.fullscreenElement = null;
  f.change();
  f.doc.fullscreenElement = f.doc.documentElement;
  f.change();
  pending.resolve();
  assert.deepEqual(await result, { ok: false, reason: "cancelled" });
  assert.deepEqual(f.calls, ["fullscreen", "unlock"]);
  assert.equal(f.doc.fullscreenElement, f.doc.documentElement);
});

test("cleanup failure is reported while other cleanup still runs", async () => {
  for (const failure of ["unlock", "exit"]) {
    const f = fixture();
    f.screen.orientation.lock = () => Promise.reject(new Error("Denied"));
    if (failure === "unlock") {
      f.screen.orientation.unlock = () => {
        f.calls.push("unlock");
        throw new Error("Unlock failed");
      };
    } else {
      f.doc.exitFullscreen = () => {
        f.calls.push("exit");
        return Promise.reject(new Error("Exit failed"));
      };
    }
    assert.deepEqual(await requestLandscape(f), {
      ok: false,
      reason: "lock",
      cleanupFailed: true,
    });
    assert.deepEqual(f.calls, ["fullscreen", "unlock", "exit"]);
    assert.equal(f.listeners.size, 0);
  }
});

test("release unlocks and exits active fullscreen", async () => {
  const f = fixture();
  f.doc.fullscreenElement = f.doc.documentElement;
  assert.deepEqual(await releaseLandscape(f), { ok: true });
  assert.deepEqual(f.calls, ["unlock", "exit"]);
  assert.equal(f.doc.fullscreenElement, null);
});

test("release without fullscreen does not call exit", async () => {
  const f = fixture();
  assert.deepEqual(await releaseLandscape(f), { ok: true });
  assert.deepEqual(f.calls, ["unlock"]);
  assert.deepEqual(await releaseLandscape({ doc: null, screen: null }), {
    ok: true,
  });
});

test("release reports unlock or exit failures and still attempts both", async () => {
  for (const failure of ["unlock", "exit", "both"]) {
    const f = fixture();
    f.doc.fullscreenElement = f.doc.documentElement;
    f.screen.orientation.unlock = () => {
      f.calls.push("unlock");
      if (failure !== "exit") throw new Error("Unlock failed");
    };
    f.doc.exitFullscreen = () => {
      f.calls.push("exit");
      if (failure !== "unlock") return Promise.reject(new Error("Exit failed"));
      f.doc.fullscreenElement = null;
    };
    assert.deepEqual(await releaseLandscape(f), { ok: false });
    assert.deepEqual(f.calls, ["unlock", "exit"]);
  }
});
