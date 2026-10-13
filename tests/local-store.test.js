import test from "node:test";
import assert from "node:assert/strict";
import {
  createEmptyState,
  insertCard,
  saveSnapshot,
} from "../src/lib/board-model.js";
import {
  STORAGE_KEY,
  loadState,
  saveState,
  replaceStoredState,
  exportState,
  importState,
} from "../src/lib/local-store.js";

function fixture() {
  let serial = 0;
  const options = {
    now: "2026-10-13T06:00:00.000Z",
    idFactory: () => `id-${++serial}`,
  };
  const initial = createEmptyState(options);
  return saveSnapshot(
    insertCard(initial, "duplicate allowed", 0, options),
    options,
  );
}

function memoryStorage(raw = null) {
  const values = new Map([["unrelated-key", "leave me alone"]]);
  if (raw !== null) values.set(STORAGE_KEY, raw);
  return {
    values,
    writes: 0,
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      this.writes += 1;
      values.set(key, value);
    },
  };
}

test("missing state is empty and reading never creates or overwrites data", () => {
  const storage = memoryStorage();
  assert.deepEqual(loadState(storage), { status: "empty" });
  assert.equal(storage.writes, 0);
  assert.equal(storage.values.get("unrelated-key"), "leave me alone");
});

test("valid state saves and reloads with cards, snapshots, settings and revision intact", () => {
  const state = fixture();
  const storage = memoryStorage();
  assert.deepEqual(saveState(storage, state), { ok: true });
  const result = loadState(storage);
  assert.equal(result.status, "ready");
  assert.deepEqual(result.state, state);
  assert.notEqual(result.state, state);
  assert.notEqual(
    result.state.histories[0].cards[0],
    state.histories[0].cards[0],
  );
  assert.equal(storage.writes, 1);
  assert.equal(storage.values.get("unrelated-key"), "leave me alone");
});

test("missing storage and read security errors produce unavailable without throwing", () => {
  for (const storage of [
    undefined,
    null,
    {},
    {
      getItem() {
        throw new globalThis.DOMException("Blocked", "SecurityError");
      },
    },
  ]) {
    assert.equal(loadState(storage).status, "unavailable");
    const save = saveState(storage, fixture());
    assert.equal(save.ok, false);
    assert.ok(save.error instanceof Error);
  }
});

test("corrupt JSON and malformed structures are preserved and block ordinary saves", () => {
  for (const raw of [
    "",
    "{",
    "null",
    "[]",
    "{}",
    '{"schemaVersion":1}',
    '{"revision":0}',
  ]) {
    const storage = memoryStorage(raw);
    const read = loadState(storage);
    assert.equal(read.status, "corrupt");
    assert.equal(read.raw, raw);
    assert.equal(saveState(storage, fixture()).ok, false);
    assert.equal(storage.getItem(STORAGE_KEY), raw);
    assert.equal(storage.writes, 0);
  }
});

test("unknown future and legacy versions are preserved without automatic migration", () => {
  for (const schemaVersion of [0, 2, 500, "1"]) {
    const raw = JSON.stringify({ ...fixture(), schemaVersion });
    const storage = memoryStorage(raw);
    const read = loadState(storage);
    assert.equal(read.status, "unsupported");
    assert.equal(read.raw, raw);
    assert.equal(saveState(storage, fixture()).ok, false);
    assert.equal(storage.getItem(STORAGE_KEY), raw);
    assert.equal(storage.writes, 0);
  }
});

test("invalid data cannot be saved, even when storage is empty", () => {
  const storage = memoryStorage();
  const bad = fixture();
  bad.activeBoard.cards[0].order = 5;
  assert.equal(saveState(storage, bad).ok, false);
  assert.equal(storage.writes, 0);
});

test("quota errors retain the last good saved data and report an actionable failure", () => {
  const raw = JSON.stringify(fixture());
  const storage = memoryStorage(raw);
  storage.setItem = () => {
    throw new globalThis.DOMException("Full", "QuotaExceededError");
  };
  const result = saveState(storage, fixture());
  assert.equal(result.ok, false);
  assert.match(result.error.message, /Export a backup/);
  assert.equal(result.error.cause.name, "QuotaExceededError");
  assert.equal(storage.getItem(STORAGE_KEY), raw);
});

test("write security errors and read-only storage are handled", () => {
  const readonly = { getItem: () => null };
  assert.equal(saveState(readonly, fixture()).ok, false);
  const blocked = {
    getItem: () => null,
    setItem: () => {
      throw new globalThis.DOMException("Blocked", "SecurityError");
    },
  };
  const result = saveState(blocked, fixture());
  assert.equal(result.ok, false);
  assert.equal(result.error.cause.name, "SecurityError");
});

test("export/import is a validated, independent round trip without storage writes", () => {
  const state = fixture();
  const imported = importState(exportState(state));
  assert.deepEqual(imported, state);
  imported.activeBoard.cards[0].text = "edited";
  assert.equal(state.activeBoard.cards[0].text, "duplicate allowed");
  assert.equal(imported.histories[0].cards[0].text, "duplicate allowed");
  for (const input of [null, {}, "", "{", "null", '{"schemaVersion":2}']) {
    assert.throws(() => importState(input));
  }
  assert.throws(
    () => exportState({ ...state, schemaVersion: 2 }),
    /Unsupported/,
  );
});

test("explicit recovery replaces only the exact previously inspected raw value", () => {
  const raw = "{ broken data";
  const storage = memoryStorage(raw);
  const state = fixture();
  assert.deepEqual(replaceStoredState(storage, state, { expectedRaw: raw }), {
    ok: true,
  });
  assert.deepEqual(loadState(storage).state, state);
  assert.equal(storage.writes, 1);
  assert.equal(storage.values.get("unrelated-key"), "leave me alone");
});

test("recovery rejects stale expected values and missing confirmations of inspected data", () => {
  const raw = "current data";
  const storage = memoryStorage(raw);
  for (const options of [
    undefined,
    {},
    { expectedRaw: undefined },
    { expectedRaw: "older data" },
    { expectedRaw: null },
  ]) {
    const result = replaceStoredState(storage, fixture(), options);
    assert.equal(result.ok, false);
    assert.equal(storage.getItem(STORAGE_KEY), raw);
    assert.equal(storage.writes, 0);
  }
});

test("explicit import into empty storage uses expectedRaw null and still validates data", () => {
  const storage = memoryStorage();
  const state = fixture();
  assert.equal(
    replaceStoredState(
      storage,
      { ...state, schemaVersion: 2 },
      { expectedRaw: null },
    ).ok,
    false,
  );
  assert.equal(storage.writes, 0);
  assert.equal(
    replaceStoredState(storage, state, { expectedRaw: null }).ok,
    true,
  );
  assert.equal(storage.writes, 1);
});

test("recovery handles storage read/write failures without deleting the previous value", () => {
  const state = fixture();
  assert.equal(
    replaceStoredState(null, state, { expectedRaw: null }).ok,
    false,
  );
  const unreadable = {
    getItem() {
      throw new Error("blocked");
    },
    setItem() {
      assert.fail("must not write");
    },
  };
  assert.equal(
    replaceStoredState(unreadable, state, { expectedRaw: null }).ok,
    false,
  );
  const storage = memoryStorage("old raw");
  storage.setItem = () => {
    throw new Error("quota");
  };
  assert.equal(
    replaceStoredState(storage, state, { expectedRaw: "old raw" }).ok,
    false,
  );
  assert.equal(storage.getItem(STORAGE_KEY), "old raw");
});

test("saving rechecks current storage so later corruption cannot be overwritten", () => {
  const storage = memoryStorage(JSON.stringify(fixture()));
  assert.equal(loadState(storage).status, "ready");
  storage.values.set(STORAGE_KEY, '{"schemaVersion":2}');
  assert.equal(saveState(storage, fixture()).ok, false);
  assert.equal(storage.writes, 0);
});
