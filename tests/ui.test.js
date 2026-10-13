import test from "node:test";
import assert from "node:assert/strict";
import React, { act } from "react";
import { JSDOM } from "jsdom";
import {
  createEmptyState,
  insertCard,
  setTheme,
  saveSnapshot,
} from "../src/lib/board-model.js";
import { STORAGE_KEY } from "../src/lib/local-store.js";

async function withApp(fn, initial, initialViewport = {}) {
  const dom = new JSDOM('<div id="root"></div>', {
    url: "https://ito.example/",
    pretendToBeVisual: true,
  });
  const win = dom.window;
  let viewport = {
    width: 1280,
    height: 800,
    coarse: false,
    ...initialViewport,
  };
  const mediaQueries = new Set();
  win.matchMedia = (query) => {
    const media = new win.EventTarget();
    media.media = query;
    Object.defineProperty(media, "matches", {
      get: () => {
        const width = query.match(/max-width:\s*(\d+)px/);
        return Boolean(
          width &&
          viewport.width <= Number(width[1]) &&
          query.includes("orientation: portrait") &&
          viewport.height >= viewport.width &&
          query.includes("pointer: coarse") &&
          viewport.coarse,
        );
      },
    });
    mediaQueries.add(media);
    return media;
  };
  // jsdom has no native modal implementation. This only enables DOM interaction tests;
  // real browser focus trapping, layout, pointer dragging and touch remain browser QA.
  win.HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  win.HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
  const names = [
    "window",
    "document",
    "navigator",
    "HTMLElement",
    "HTMLInputElement",
    "HTMLTextAreaElement",
    "MutationObserver",
    "getComputedStyle",
    "requestAnimationFrame",
    "cancelAnimationFrame",
    "IS_REACT_ACT_ENVIRONMENT",
  ];
  const original = Object.fromEntries(
    names.map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]),
  );
  for (const key of names)
    Object.defineProperty(globalThis, key, {
      value:
        key === "IS_REACT_ACT_ENVIRONMENT"
          ? true
          : key === "window"
            ? win
            : key === "document"
              ? win.document
              : win[key],
      configurable: true,
      writable: true,
    });
  if (initial) win.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
  const { createRoot } = await import("react-dom/client");
  const { default: App } =
    await import("../node_modules/.cache/ito-helper-ui/app.mjs");
  const root = createRoot(document.getElementById("root"));
  const query = (selector) => document.querySelector(selector);
  const button = (text) =>
    [...document.querySelectorAll("button")].find(
      (el) => el.textContent.trim() === text,
    );
  const click = async (element) => {
    assert.ok(element, "Expected element exists");
    await act(async () => {
      element.focus();
      element.click();
      await new Promise((resolve) => win.setTimeout(resolve, 0));
    });
  };
  const input = async (element, value) => {
    assert.ok(element);
    await act(() => {
      const proto =
        element.tagName === "TEXTAREA"
          ? win.HTMLTextAreaElement.prototype
          : win.HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, "value").set.call(element, value);
      element.dispatchEvent(new win.Event("input", { bubbles: true }));
    });
  };
  const persisted = () => JSON.parse(win.localStorage.getItem(STORAGE_KEY));
  try {
    await act(() => root.render(React.createElement(App)));
    await fn({
      query,
      button,
      click,
      input,
      persisted,
      win,
      setViewport: async (next) => {
        await act(() => {
          viewport = { ...viewport, ...next };
          for (const media of mediaQueries)
            media.dispatchEvent(new win.Event("change"));
        });
      },
      remount: async () => {
        await act(() => root.render(null));
        await act(() => root.render(React.createElement(App)));
      },
    });
  } finally {
    await act(() => root.unmount());
    win.close();
    for (const [key, descriptor] of Object.entries(original)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
}
function exampleBoard() {
  return insertCard(
    insertCard(setTheme(createEmptyState(), "うれしいこと"), "二度寝"),
    "カフェ",
  );
}

test("UI adds duplicate cards, edits, reorders, saves idempotently, and restores on remount", async () =>
  withApp(async ({ query, button, click, input, persisted, remount }) => {
    assert.equal(query("h1").textContent, "ボード");
    assert.equal(query('input[type="password"]'), null);
    await input(query("#theme"), "うれしいこと");
    await click(button("最初のカードを追加"));
    await input(query("#card-text"), "二度寝");
    await click(button("追加する"));
    await click(button("カードを追加"));
    await input(query("#card-text"), "二度寝");
    await click(button("追加する"));
    assert.equal(document.querySelectorAll("article.card").length, 2);
    const cards = persisted().activeBoard.cards;
    assert.notEqual(cards[0].id, cards[1].id);
    await click(button("編集"));
    await input(query("#card-text"), "カフェ");
    await click(button("変更する"));
    await click(query('[aria-label="カード2を左へ"]'));
    assert.deepEqual(
      persisted().activeBoard.cards.map((c) => c.text),
      ["二度寝", "カフェ"],
    );
    await click(button("このボードを履歴に保存"));
    await click(button("このボードを履歴に保存"));
    assert.equal(persisted().histories.length, 1);
    assert.match(document.body.textContent, /すでに履歴に保存/);
    await remount();
    assert.equal(query("#theme").value, "うれしいこと");
    assert.equal(document.querySelectorAll("article.card").length, 2);
  }));

test("UI cancel/reset/undo preserve data and later edits invalidate stale undo", async () =>
  withApp(async ({ query, button, click, input, persisted }) => {
    await click(button("カードをリセット"));
    await click(button("キャンセル"));
    assert.equal(document.querySelectorAll("article.card").length, 2);
    await click(button("カードをリセット"));
    await click(button("リセットする"));
    assert.equal(document.querySelectorAll("article.card").length, 0);
    await click(button("元に戻す"));
    assert.equal(document.querySelectorAll("article.card").length, 2);
    await click(query('[aria-label="カード1を削除"]'));
    await click(button("削除する"));
    assert.ok(button("元に戻す"));
    await input(query("#theme"), "こわいもの");
    await act(() =>
      query("#theme").dispatchEvent(
        new window.FocusEvent("focusout", { bubbles: true }),
      ),
    );
    assert.equal(button("元に戻す"), undefined);
    assert.equal(persisted().activeBoard.theme, "こわいもの");
    assert.equal(persisted().activeBoard.cards.length, 1);
  }, exampleBoard()));

test("UI dialogs cancel and return focus; nested restoration cancel keeps history detail", async () =>
  withApp(async ({ query, button, click, win }) => {
    const launcher = button("カードを追加");
    await click(launcher);
    assert.equal(document.querySelectorAll("dialog[open]").length, 1);
    await act(() =>
      query("dialog").dispatchEvent(
        new win.Event("cancel", { cancelable: true }),
      ),
    );
    assert.equal(query("dialog"), null);
    assert.equal(document.activeElement, launcher);
    await click(button("このボードを履歴に保存"));
    await click(
      [...document.querySelectorAll(".main-nav button")].find((el) =>
        el.textContent.includes("履歴"),
      ),
    );
    await click(button("記録を見る"));
    await click(button("ボードに戻す"));
    assert.equal(document.querySelectorAll("dialog[open]").length, 2);
    await click(button("キャンセル"));
    assert.equal(document.querySelectorAll("dialog[open]").length, 1);
    assert.ok(query(".history-detail"));
  }, exampleBoard()));

test("UI uses functional labels across the board, history, help, and settings", async () =>
  withApp(async ({ query, button, click }) => {
    const decorativeCopy =
      /ことばを、並べよう。|ちがう価値観|みんなのことば|なるほど|ちいさな相棒|思い出|手元に残す|最初のことば|はじめよう|LET’S PLAY|YOUR COLLECTION|PLAYING TABLE|TABLE VIEW|HOW TO PLAY|KEEP YOUR WORDS|EDIT CARD|NEW CARD|THEME/;
    const checkCopy = () =>
      assert.doesNotMatch(document.body.textContent, decorativeCopy);
    assert.equal(query("h1").textContent, "ボード");
    assert.equal(query(".empty-board h2").textContent, "カードがありません");
    checkCopy();
    await click(button("カードを追加"));
    assert.equal(query("dialog h2").textContent, "カードを追加");
    assert.match(query("dialog").textContent, /1番目の位置/);
    checkCopy();
    await click(button("キャンセル"));
    await click(query('[aria-label="遊び方"]'));
    assert.equal(query("dialog h2").textContent, "遊び方");
    assert.match(query("dialog").textContent, /左右ボタン/);
    checkCopy();
    await click(button("閉じる"));
    await click(query('[aria-label="設定とバックアップ"]'));
    assert.ok(
      [...document.querySelectorAll("dialog h3")].some(
        (el) => el.textContent === "バックアップ",
      ),
    );
    assert.match(query("dialog").textContent, /データ消去|プライベートモード/);
    checkCopy();
    await click(query('dialog [aria-label="閉じる"]'));
    await click(button("履歴"));
    assert.equal(query("h1").textContent, "履歴");
    assert.equal(
      query(".history-empty h2").textContent,
      "保存した履歴はありません",
    );
    checkCopy();
  }));

test("UI copy cleanup preserves user themes, declarations, and saved histories unchanged", async () => {
  const initial = saveSnapshot(
    insertCard(
      setTheme(createEmptyState(), "ことばを、並べよう。"),
      "思い出は、ここに並びます。",
    ),
  );
  await withApp(async ({ query, click, button, persisted, remount }) => {
    assert.equal(query("#theme").value, initial.activeBoard.theme);
    assert.match(
      query("article.card").textContent,
      /思い出は、ここに並びます。/,
    );
    await click(
      [...document.querySelectorAll(".main-nav button")].find((el) =>
        el.textContent.includes("履歴"),
      ),
    );
    await click(button("記録を見る"));
    assert.equal(query("dialog h2").textContent, initial.activeBoard.theme);
    assert.equal(
      query(".history-detail p").textContent,
      initial.activeBoard.cards[0].text,
    );
    await click(button("閉じる"));
    await remount();
    assert.deepEqual(persisted(), initial);
  }, initial);
});

test("theme sun icon uses short relative rays on both left diagonals", async () =>
  withApp(async ({ query }) => {
    const icon = query(".theme-symbol svg");
    assert.equal(icon.getAttribute("viewBox"), "0 0 24 24");
    assert.equal(icon.getAttribute("aria-hidden"), "true");
    const path = icon.querySelector("path").getAttribute("d");
    // A missing l makes the second coordinate pair an absolute line endpoint.
    // In particular (1.4, -1.4) creates a long stroke across the left side.
    assert.match(path, /M5\.6 5\.6l1\.4 1\.4/);
    assert.match(path, /M5\.6 18\.4l1\.4-1\.4/);
    assert.doesNotMatch(path, /M5\.6 (?:5\.6|18\.4) 1\.4/);
  }));

test("portrait phone prompts to rotate while retaining board, history, and an open editor", async () => {
  const initial = saveSnapshot(exampleBoard());
  await withApp(
    async ({ query, button, click, input, persisted, setViewport, win }) => {
      const notice = query(".orientation-notice[open]");
      assert.ok(notice);
      assert.equal(
        query("#orientation-heading").textContent,
        "端末を横向きにしてください",
      );
      assert.deepEqual(persisted(), initial);
      const cancel = new win.Event("cancel", { cancelable: true });
      await act(() => notice.dispatchEvent(cancel));
      assert.equal(cancel.defaultPrevented, true);
      assert.ok(query(".orientation-notice[open]"));
      await setViewport({ width: 844, height: 390 });
      assert.equal(query(".orientation-notice"), null);
      assert.equal(document.querySelectorAll("article.card").length, 2);
      assert.equal(document.querySelectorAll(".card-face.reverse").length, 2);
      await click(button("編集"));
      await input(query("#card-text"), "入力途中の宣言文");
      await setViewport({ width: 390, height: 844 });
      assert.ok(query(".orientation-notice[open]"));
      assert.equal(query("#card-text").value, "入力途中の宣言文");
      await setViewport({ width: 844, height: 390 });
      assert.equal(query(".orientation-notice"), null);
      assert.ok(query(".dialog[open]"));
      assert.equal(query("#card-text").value, "入力途中の宣言文");
      await click(button("キャンセル"));
      assert.deepEqual(persisted(), initial);
    },
    initial,
    { width: 390, height: 844, coarse: true },
  );
});

test("orientation prompt does not block tablet-sized portrait or narrow desktop layouts", async () =>
  withApp(
    async ({ query, setViewport, win, remount }) => {
      assert.equal(query(".orientation-notice"), null);
      await setViewport({ width: 390, height: 844, coarse: false });
      assert.equal(query(".orientation-notice"), null);
      await setViewport({ width: 540, height: 960, coarse: true });
      assert.ok(query(".orientation-notice[open]"));
      await setViewport({ width: 600, height: 960 });
      assert.equal(query(".orientation-notice"), null);
      delete win.matchMedia;
      await remount();
      assert.equal(query(".orientation-notice"), null);
    },
    undefined,
    { width: 768, height: 1024, coarse: true },
  ));

function orientationApis(win, lock = async () => {}) {
  let fullscreen = null;
  const calls = { enter: 0, lock: 0, unlock: 0, exit: 0 };
  Object.defineProperty(win.document, "fullscreenEnabled", {
    configurable: true,
    value: true,
  });
  Object.defineProperty(win.document, "fullscreenElement", {
    configurable: true,
    get: () => fullscreen,
  });
  win.document.documentElement.requestFullscreen = async () => {
    calls.enter += 1;
    fullscreen = win.document.documentElement;
    win.document.dispatchEvent(new win.Event("fullscreenchange"));
  };
  win.document.exitFullscreen = async () => {
    calls.exit += 1;
    fullscreen = null;
    win.document.dispatchEvent(new win.Event("fullscreenchange"));
  };
  Object.defineProperty(win.screen, "orientation", {
    configurable: true,
    value: {
      lock: async (value) => {
        calls.lock += 1;
        assert.equal(value, "landscape");
        await lock();
      },
      unlock: () => {
        calls.unlock += 1;
      },
    },
  });
  return calls;
}

test("landscape button is available in settings and portrait notice with unsupported fallback", async () =>
  withApp(
    async ({ query, button, click, setViewport }) => {
      await click(query(".orientation-notice button"));
      assert.match(
        query('.orientation-notice [role="status"]').textContent,
        /この環境では自動で横向きにできません/,
      );
      await setViewport({ width: 844, height: 390 });
      await click(query('[aria-label="設定とバックアップ"]'));
      await click(button("全画面で横向きにする"));
      assert.match(
        query('dialog [role="status"]').textContent,
        /端末を横向きにしてください/,
      );
    },
    undefined,
    { width: 390, height: 844, coarse: true },
  ));

test("orientation controls wait for success, ignore repeated starts, and allow fullscreen exit", async () =>
  withApp(async ({ query, button, click, win }) => {
    let finishLock;
    const delayedLock = new Promise((resolve) => {
      finishLock = resolve;
    });
    const calls = orientationApis(win, () => delayedLock);
    assert.equal(calls.enter, 0, "No automatic fullscreen on mount");
    await click(query('[aria-label="設定とバックアップ"]'));
    await click(button("全画面で横向きにする"));
    assert.equal(calls.enter, 1);
    assert.ok(button("切り替え中…").disabled);
    assert.doesNotMatch(
      query("dialog").textContent,
      /横向き表示を設定しました/,
    );
    await click(button("切り替え中…"));
    assert.equal(calls.enter, 1);
    await act(async () => {
      finishLock();
      await delayedLock;
    });
    assert.match(
      query('dialog [role="status"]').textContent,
      /横向き表示を設定しました/,
    );
    await click(button("横向き・全画面を解除"));
    assert.equal(calls.unlock, 1);
    assert.equal(calls.exit, 1);
    assert.equal(win.document.fullscreenElement, null);
    assert.match(query('dialog [role="status"]').textContent, /解除しました/);
  }));

test("orientation request can be cancelled while lock is pending without stale success", async () =>
  withApp(async ({ query, button, click, win }) => {
    let finishLock;
    const delayedLock = new Promise((resolve) => {
      finishLock = resolve;
    });
    const calls = orientationApis(win, () => delayedLock);
    await click(query('[aria-label="設定とバックアップ"]'));
    await click(button("全画面で横向きにする"));
    await click(button("横向き・全画面を解除"));
    await click(button("横向き・全画面を解除"));
    assert.equal(calls.exit, 1);
    await act(async () => {
      finishLock();
      await delayedLock;
    });
    assert.equal(win.document.fullscreenElement, null);
    assert.doesNotMatch(
      query("dialog").textContent,
      /横向き表示を設定しました/,
    );
    assert.ok(!button("全画面で横向きにする").disabled);
    assert.match(query('dialog [role="status"]').textContent, /解除しました/);
  }));

test("rules modal embeds the sequential-play diagram and preserves saved content when closed", async () => {
  const initial = saveSnapshot(exampleBoard());
  await withApp(async ({ query, button, click, persisted, win }) => {
    assert.equal(
      query("#rules-diagram"),
      null,
      "Diagram does not occupy the board",
    );
    const opener = query('[aria-label="遊び方"]');
    await click(opener);
    const diagram = query("#rules-diagram img");
    assert.match(diagram.getAttribute("src"), /^data:image\/webp;base64,/);
    assert.equal(diagram.getAttribute("width"), "883");
    assert.match(diagram.alt, /実物9枚とアプリ9枚/);
    assert.match(query("dialog").textContent, /人数・1人の枚数は自由/);
    assert.match(query("dialog").textContent, /1枚ずつ繰り返します/);
    assert.match(
      query("dialog").textContent,
      /全カードを出してから手元のカードをめくり/,
    );
    assert.match(
      query("dialog").textContent,
      /数字や持ち主を登録する必要はありません/,
    );
    assert.match(query("dialog").textContent, /「カードを追加」は末尾/);
    await click(button("図を拡大"));
    assert.equal(button("図を全体表示").getAttribute("aria-pressed"), "true");
    assert.ok(query("#rules-diagram").classList.contains("is-zoomed"));
    assert.equal(query("#rules-diagram").getAttribute("tabindex"), "0");
    await click(button("図を全体表示"));
    assert.ok(!query("#rules-diagram").classList.contains("is-zoomed"));
    await act(() =>
      query("dialog").dispatchEvent(
        new win.Event("cancel", { cancelable: true }),
      ),
    );
    assert.equal(query("#rules-diagram"), null);
    assert.equal(document.activeElement, opener);
    assert.deepEqual(persisted(), initial);
  }, initial);
});
