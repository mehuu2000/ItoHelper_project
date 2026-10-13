import test from "node:test";
import assert from "node:assert/strict";
import {
  createEmptyState,
  normalizeCards,
  validateState,
  setTheme,
  insertCard,
  updateCard,
  moveCard,
  removeCards,
  resetBoard,
  replaceActiveBoard,
  saveSnapshot,
  restoreSnapshot,
  removeSnapshot,
  setSettings,
} from "../src/lib/board-model.js";

const NOW = "2026-10-13T06:00:00.000Z";
const LATER = "2026-10-13T07:00:00.000Z";
function fixture() {
  let serial = 0;
  const options = { now: NOW, idFactory: () => `id-${++serial}` };
  return { state: createEmptyState(options), options };
}
function append(state, text, options) {
  return insertCard(state, text, state.activeBoard.cards.length, options);
}
function deepFreeze(value) {
  if (value && typeof value === "object") {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

test("a new state is a valid local-only envelope", () => {
  const { state } = fixture();
  assert.equal(validateState(state).valid, true);
  assert.deepEqual(state, {
    schemaVersion: 1,
    revision: 0,
    activeBoard: { id: "id-1", theme: "", cards: [], updatedAt: NOW },
    histories: [],
    settings: { confirmDestructive: true },
    updatedAt: NOW,
  });
  assert.notEqual(
    createEmptyState().activeBoard.id,
    createEmptyState().activeBoard.id,
  );
});

test("duplicate text represents independently editable and removable cards", () => {
  let { state, options } = fixture();
  state = append(state, " りんご ", options);
  state = append(state, "りんご", options);
  const [first, second] = state.activeBoard.cards;
  assert.notEqual(first.id, second.id);
  assert.equal(first.text, second.text);
  state = updateCard(state, first.id, "みかん", options);
  assert.deepEqual(
    state.activeBoard.cards.map((card) => card.text),
    ["みかん", "りんご"],
  );
  state = removeCards(state, [first.id], options);
  assert.deepEqual(state.activeBoard.cards, [{ ...second, order: 0 }]);
});

test("cards have no player cap, number, owner, or user fields", () => {
  let { state, options } = fixture();
  for (let i = 0; i < 300; i += 1) state = append(state, `item ${i}`, options);
  assert.equal(state.activeBoard.cards.length, 300);
  assert.equal(
    new Set(state.activeBoard.cards.map((card) => card.id)).size,
    300,
  );
  assert.deepEqual(Object.keys(state.activeBoard.cards[200]), [
    "id",
    "text",
    "order",
  ]);
  assert.equal(validateState(state).valid, true);
});

test("normalization preserves array order and creates contiguous order values", () => {
  const original = deepFreeze([
    { id: "a", text: " one ", order: 99 },
    { id: "b", text: "two", order: -2 },
  ]);
  assert.deepEqual(normalizeCards(original), [
    { id: "a", text: "one", order: 0 },
    { id: "b", text: "two", order: 1 },
  ]);
  assert.deepEqual(normalizeCards([]), []);
  assert.throws(
    () =>
      normalizeCards([
        { id: "a", text: "one" },
        { id: "a", text: "two" },
      ]),
    /ID/,
  );
  assert.throws(() => normalizeCards(Array(2)), /ID/);
});

test("empty and whitespace-only card text is rejected without changing the input", () => {
  let { state, options } = fixture();
  state = append(state, "existing", options);
  deepFreeze(state);
  for (const text of ["", " \t\n ", "　", null, 12]) {
    assert.throws(() => append(state, text, options), /blank/);
    assert.throws(
      () => updateCard(state, state.activeBoard.cards[0].id, text, options),
      /blank/,
    );
  }
  assert.equal(state.activeBoard.cards[0].text, "existing");
});

test("insertion, movement, editing, and multi-delete are immutable and normalize order", () => {
  let { state, options } = fixture();
  state = append(state, "first", options);
  state = append(state, "last", options);
  deepFreeze(state);
  const inserted = insertCard(state, "middle", 1, { ...options, now: LATER });
  assert.deepEqual(
    state.activeBoard.cards.map((card) => card.text),
    ["first", "last"],
  );
  assert.deepEqual(
    inserted.activeBoard.cards.map((card) => card.text),
    ["first", "middle", "last"],
  );
  assert.equal(inserted.updatedAt, LATER);
  assert.equal(inserted.activeBoard.updatedAt, LATER);
  const moved = moveCard(
    deepFreeze(inserted),
    inserted.activeBoard.cards[2].id,
    0,
    options,
  );
  assert.deepEqual(
    moved.activeBoard.cards.map((card) => card.text),
    ["last", "first", "middle"],
  );
  assert.deepEqual(
    moved.activeBoard.cards.map((card) => card.order),
    [0, 1, 2],
  );
  const edited = updateCard(
    deepFreeze(moved),
    moved.activeBoard.cards[1].id,
    "changed",
    options,
  );
  const removed = removeCards(
    deepFreeze(edited),
    new Set([edited.activeBoard.cards[0].id, edited.activeBoard.cards[2].id]),
    options,
  );
  assert.deepEqual(
    removed.activeBoard.cards.map(({ text, order }) => ({ text, order })),
    [{ text: "changed", order: 0 }],
  );
  assert.equal(removed.revision, state.revision + 4);
});

test("no-op operations return the original state without incrementing revision", () => {
  let { state, options } = fixture();
  state = append(state, "one", options);
  const id = state.activeBoard.cards[0].id;
  assert.equal(moveCard(state, id, 0), state);
  assert.equal(updateCard(state, id, " one "), state);
  assert.equal(removeCards(state, ["missing"]), state);
  assert.equal(removeCards(state, []), state);
  assert.equal(setTheme(state, ""), state);
  assert.equal(setSettings(state, { confirmDestructive: true }), state);
  assert.equal(removeSnapshot(state, "missing"), state);
});

test("invalid card IDs, insertion indices and movement indices are rejected", () => {
  let { state, options } = fixture();
  state = append(state, "one", options);
  for (const index of [-1, 3, 0.5, NaN]) {
    assert.throws(() => insertCard(state, "two", index, options), /range/);
    assert.throws(
      () => moveCard(state, state.activeBoard.cards[0].id, index, options),
      /range/,
    );
  }
  assert.throws(() => updateCard(state, "missing", "text"), /not found/);
  assert.throws(() => moveCard(state, "missing", 0), /not found/);
  assert.throws(() => removeCards(state, "some-id"), /array or Set/);
  assert.throws(
    () =>
      insertCard(state, "two", 1, {
        ...options,
        idFactory: () => state.activeBoard.id,
      }),
    /new, nonempty ID/,
  );
});

test("saving a snapshot copies cards; subsequent edits and reset preserve history", () => {
  let { state, options } = fixture();
  state = setTheme(state, "かわいいもの", options);
  state = append(state, "cat", options);
  deepFreeze(state);
  const saved = saveSnapshot(state, options);
  const snapshot = saved.histories[0];
  assert.notEqual(snapshot.cards, saved.activeBoard.cards);
  assert.notEqual(snapshot.cards[0], saved.activeBoard.cards[0]);
  assert.equal(snapshot.boardId, state.activeBoard.id);
  const edited = updateCard(
    deepFreeze(saved),
    state.activeBoard.cards[0].id,
    "dog",
    options,
  );
  const reset = resetBoard(edited, { ...options, now: LATER });
  assert.equal(snapshot.cards[0].text, "cat");
  assert.equal(snapshot.theme, "かわいいもの");
  assert.deepEqual(reset.histories, [snapshot]);
  assert.equal(reset.activeBoard.cards.length, 0);
  assert.equal(reset.activeBoard.theme, "");
  assert.notEqual(reset.activeBoard.id, state.activeBoard.id);
  assert.equal(reset.updatedAt, LATER);
});

test("snapshot saving is idempotent for identical content, including after a restore", () => {
  let { state, options } = fixture();
  state = append(state, "one", options);
  state = saveSnapshot(state, options);
  assert.equal(saveSnapshot(state, options), state);
  const changedTheme = saveSnapshot(
    setTheme(state, "new theme", options),
    options,
  );
  assert.equal(changedTheme.histories.length, 2);
  const restored = restoreSnapshot(
    deepFreeze(changedTheme),
    state.histories[0].id,
    options,
  );
  assert.equal(restored.activeBoard.theme, "");
  assert.notEqual(restored.activeBoard.cards, restored.histories[0].cards);
  assert.equal(saveSnapshot(restored, options), restored);
  assert.throws(() => restoreSnapshot(state, "missing", options), /not found/);
});

test("history IDs and card IDs are independent, and history is never pruned", () => {
  let { state, options } = fixture();
  state = append(state, "one", options);
  for (let i = 0; i < 110; i += 1) {
    state = saveSnapshot(setTheme(state, `theme ${i}`, options), options);
  }
  assert.equal(state.histories.length, 110);
  assert.equal(new Set(state.histories.map((entry) => entry.id)).size, 110);
  assert.ok(state.histories.every((entry) => entry.id !== entry.cards[0].id));
  const removed = removeSnapshot(
    deepFreeze(state),
    state.histories[40].id,
    options,
  );
  assert.equal(removed.histories.length, 109);
  assert.equal(state.histories.length, 110);
});

test("reset can preserve the theme and always preserves saved history and settings", () => {
  let { state, options } = fixture();
  state = setSettings(
    setTheme(state, "theme", options),
    { confirmDestructive: false },
    options,
  );
  state = saveSnapshot(state, options);
  const reset = resetBoard(deepFreeze(state), { ...options, keepTheme: true });
  assert.equal(reset.activeBoard.theme, "theme");
  assert.deepEqual(reset.histories, state.histories);
  assert.deepEqual(reset.settings, { confirmDestructive: false });
});

test("undo replacement preserves newer history and settings instead of rewinding them", () => {
  let { state, options } = fixture();
  state = append(state, "one", options);
  const before = deepFreeze(state.activeBoard);
  state = resetBoard(state, options);
  state = setSettings(state, { confirmDestructive: false }, options);
  state = saveSnapshot(state, options);
  const restored = replaceActiveBoard(deepFreeze(state), before, {
    ...options,
    now: LATER,
  });
  assert.equal(restored.activeBoard.id, before.id);
  assert.deepEqual(restored.activeBoard.cards, before.cards);
  assert.notEqual(restored.activeBoard.cards[0], before.cards[0]);
  assert.equal(restored.activeBoard.updatedAt, LATER);
  assert.equal(restored.revision, state.revision + 1);
  assert.equal(restored.histories, state.histories);
  assert.equal(restored.settings, state.settings);
  assert.throws(
    () =>
      replaceActiveBoard(state, {
        ...before,
        cards: [{ id: "x", text: "", order: 0 }],
      }),
    /Invalid/,
  );
});

test("malformed, extra-field, and future-version data fail validation", () => {
  let { state, options } = fixture();
  state = saveSnapshot(append(state, "one", options), options);
  const mutations = [
    () => null,
    () => [],
    (copy) => ({ ...copy, schemaVersion: 2 }),
    (copy) => ({ ...copy, revision: -1 }),
    (copy) => ({ ...copy, updatedAt: "nonsense" }),
    (copy) => ({ ...copy, settings: { confirmDestructive: "true" } }),
    (copy) => ({
      ...copy,
      activeBoard: { ...copy.activeBoard, userId: "legacy-user" },
    }),
    (copy) => {
      copy.activeBoard.cards[0].order = 10;
      return copy;
    },
    (copy) => {
      copy.activeBoard.cards[0].number = 50;
      return copy;
    },
    (copy) => {
      copy.activeBoard.cards[0].text = " ";
      return copy;
    },
    (copy) => {
      copy.activeBoard.cards = Array(2);
      return copy;
    },
    (copy) => {
      copy.histories[0].fingerprint = "wrong";
      return copy;
    },
    (copy) => {
      copy.histories.push(copy.histories[0]);
      return copy;
    },
  ];
  for (const mutate of mutations) {
    const result = validateState(mutate(structuredClone(state)));
    assert.equal(result.valid, false);
    assert.ok(result.errors.length > 0);
  }
});

test("bad clock values, invalid settings and revision overflow are rejected", () => {
  const { state, options } = fixture();
  assert.throws(
    () => createEmptyState({ ...options, now: "invalid" }),
    /ISO timestamp/,
  );
  assert.throws(
    () => setSettings(state, { confirmDestructive: 0 }),
    /true or false/,
  );
  assert.throws(
    () => setSettings(state, { confirmDestructive: true, other: 1 }),
    /true or false/,
  );
  assert.throws(
    () => setTheme({ ...state, revision: Number.MAX_SAFE_INTEGER }, "changed"),
    /Revision limit/,
  );
});
