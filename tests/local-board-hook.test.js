import test from "node:test";
import assert from "node:assert/strict";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { useLocalBoard } from "../src/hooks/useLocalBoard.js";
import {
  createEmptyState,
  insertCard,
  setTheme,
  saveSnapshot,
} from "../src/lib/board-model.js";
import { STORAGE_KEY } from "../src/lib/local-store.js";

class MemoryStorage {
  value = null;
  failWrite = false;
  getItem() {
    return this.value;
  }
  setItem(key, value) {
    if (this.failWrite) throw new Error("QuotaExceededError");
    this.value = value;
  }
}
async function harness(fn, storage = new MemoryStorage()) {
  const dom = new JSDOM('<div id="root"></div>', {
    url: "https://ito.example/",
  });
  const original = Object.fromEntries(
    ["window", "document", "HTMLElement", "IS_REACT_ACT_ENVIRONMENT"].map(
      (key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)],
    ),
  );
  Object.defineProperty(dom.window, "localStorage", {
    value: storage,
    configurable: true,
  });
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  let current;
  function Component() {
    current = useLocalBoard();
    return null;
  }
  const root = createRoot(document.getElementById("root"));
  try {
    await act(() => root.render(React.createElement(Component)));
    await fn(() => current, storage, dom.window);
  } finally {
    await act(() => root.unmount());
    dom.window.close();
    for (const [key, descriptor] of Object.entries(original)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
}

test("hook saves updates and flushes latest debounced theme on pagehide", async () =>
  harness(async (get, storage, win) => {
    await act(() => get().update((state) => insertCard(state, "二度寝")));
    await act(() =>
      get().update((state) => setTheme(state, "うれしいこと"), { defer: true }),
    );
    assert.equal(get().status, "saving");
    await act(() => win.dispatchEvent(new win.Event("pagehide")));
    assert.equal(JSON.parse(storage.value).activeBoard.theme, "うれしいこと");
    assert.equal(get().status, "saved");
  }));

test("hook preserves corrupt data and blocks autosave until explicit replacement", async () => {
  const storage = new MemoryStorage();
  storage.value = "{broken";
  await harness(async (get) => {
    assert.equal(get().issue, "corrupt");
    await act(() =>
      get().update((state) => insertCard(state, "保護される変更")),
    );
    assert.equal(storage.value, "{broken");
    assert.equal(get().status, "error");
    let ok;
    await act(() => {
      ok = get().replace(get().state, "{broken");
    });
    assert.equal(ok, true);
    assert.equal(get().status, "saved");
  }, storage);
});

test("a cross-tab change is detected even before its storage event arrives", async () =>
  harness(async (get, storage) => {
    await act(() => get().update((state) => insertCard(state, "このタブ")));
    const remote = insertCard(createEmptyState(), "別のタブ");
    storage.value = JSON.stringify(remote);
    await act(() => get().update((state) => setTheme(state, "未保存")));
    assert.equal(get().issue, "conflict");
    assert.equal(storage.value, JSON.stringify(remote));
    let ok;
    await act(() => {
      ok = get().retry();
    });
    assert.equal(ok, false);
    assert.equal(storage.value, JSON.stringify(remote));
  }));

test("stale recovery confirmation cannot be bypassed through retry", async () =>
  harness(async (get, storage, win) => {
    await act(() => get().update((state) => insertCard(state, "このタブ")));
    storage.value = JSON.stringify(
      insertCard(createEmptyState(), "別のタブ 1"),
    );
    const event = new win.Event("storage");
    Object.defineProperties(event, {
      key: { value: STORAGE_KEY },
      storageArea: { value: storage },
    });
    await act(() => win.dispatchEvent(event));
    const inspected = get().currentRaw();
    const newest = JSON.stringify(insertCard(createEmptyState(), "別のタブ 2"));
    storage.value = newest;
    let ok;
    await act(() => {
      ok = get().replace(get().state, inspected);
    });
    assert.equal(ok, false);
    assert.equal(get().issue, "conflict");
    await act(() => {
      ok = get().retry();
    });
    assert.equal(ok, false);
    assert.equal(storage.value, newest);
  }));

test("quota failure stays unsaved through duplicate save and can recover safely", async () =>
  harness(async (get, storage) => {
    await act(() => get().update((state) => insertCard(state, "二度寝")));
    storage.failWrite = true;
    await act(() => get().update((state) => saveSnapshot(state)));
    assert.equal(get().status, "error");
    let result;
    await act(() => {
      result = get().update((state) => saveSnapshot(state));
    });
    assert.equal(result.changed, false);
    assert.equal(result.saved, false);
    storage.failWrite = false;
    let ok;
    await act(() => {
      ok = get().retry();
    });
    assert.equal(ok, true);
    assert.equal(JSON.parse(storage.value).histories.length, 1);
  }));

test("reload accepts remote state without writing a stale board over it", async () =>
  harness(async (get, storage) => {
    await act(() => get().update((state) => insertCard(state, "このタブ")));
    const remote = insertCard(createEmptyState(), "別のタブ");
    storage.value = JSON.stringify(remote);
    await act(() => get().update((state) => setTheme(state, "未保存")));
    await act(() => get().reload());
    assert.deepEqual(get().state, remote);
    assert.equal(get().status, "saved");
    assert.equal(storage.value, JSON.stringify(remote));
  }));

test("a valid backup remains viewable in memory when storage quota blocks import", async () =>
  harness(async (get, storage) => {
    await act(() => get().update((state) => insertCard(state, "元のデータ")));
    const before = storage.value;
    const backup = insertCard(createEmptyState(), "バックアップの内容");
    storage.failWrite = true;
    let result;
    await act(() => {
      result = get().importReplacement(backup, before);
    });
    assert.deepEqual(result, { loaded: true, saved: false });
    assert.equal(get().state.activeBoard.cards[0].text, "バックアップの内容");
    assert.equal(get().status, "error");
    assert.equal(storage.value, before);
    storage.failWrite = false;
    let ok;
    await act(() => {
      ok = get().retry();
    });
    assert.equal(ok, true);
    assert.equal(
      JSON.parse(storage.value).activeBoard.cards[0].text,
      "バックアップの内容",
    );
  }));
