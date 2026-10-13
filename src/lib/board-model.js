export const SCHEMA_VERSION = 1;

const object = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const exactKeys = (value, keys) =>
  object(value) &&
  Object.keys(value).length === keys.length &&
  keys.every((key) => Object.hasOwn(value, key));
const validId = (value) =>
  typeof value === "string" && value.length > 0 && value === value.trim();
const validTime = (value) =>
  typeof value === "string" &&
  Number.isFinite(Date.parse(value)) &&
  new Date(value).toISOString() === value;

function timestamp(options = {}) {
  const value = options.now ?? new Date().toISOString();
  if (!validTime(value)) throw new TypeError("now must be an ISO timestamp.");
  return value;
}

function usedIds(state) {
  if (!state) return new Set();
  return new Set([
    state.activeBoard.id,
    ...state.activeBoard.cards.map((card) => card.id),
    ...state.histories.flatMap((snapshot) => [
      snapshot.id,
      snapshot.boardId,
      ...snapshot.cards.map((card) => card.id),
    ]),
  ]);
}

function newId(state, options = {}) {
  const id = options.idFactory
    ? options.idFactory()
    : globalThis.crypto.randomUUID();
  if (!validId(id) || usedIds(state).has(id)) {
    throw new TypeError("The ID factory must return a new, nonempty ID.");
  }
  return id;
}

function cardText(text) {
  if (typeof text !== "string" || !text.trim()) {
    throw new TypeError("Card text cannot be blank.");
  }
  return text.trim();
}

/** Array position is authoritative. Every card has exactly id, text and order. */
export function normalizeCards(cards) {
  if (!Array.isArray(cards)) throw new TypeError("Cards must be an array.");
  const ids = new Set();
  return Array.from(cards, (card, order) => {
    if (!object(card) || !validId(card.id) || ids.has(card.id)) {
      throw new TypeError("Each card needs its own nonempty ID.");
    }
    ids.add(card.id);
    return { id: card.id, text: cardText(card.text), order };
  });
}

export function boardFingerprint(board) {
  return JSON.stringify([
    board.theme,
    board.cards.map(({ id, text, order }) => [id, text, order]),
  ]);
}

function validCards(cards) {
  if (!Array.isArray(cards)) return false;
  const ids = new Set();
  for (const [index, card] of cards.entries()) {
    if (
      !exactKeys(card, ["id", "text", "order"]) ||
      !validId(card.id) ||
      ids.has(card.id) ||
      typeof card.text !== "string" ||
      !card.text.trim() ||
      card.text !== card.text.trim() ||
      card.order !== index
    )
      return false;
    ids.add(card.id);
  }
  return true;
}

/** Validate persisted/imported data without changing it or silently dropping fields. */
export function validateState(value) {
  const errors = [];
  if (
    !exactKeys(value, [
      "schemaVersion",
      "revision",
      "activeBoard",
      "histories",
      "settings",
      "updatedAt",
    ])
  ) {
    return { valid: false, errors: ["Invalid state structure."] };
  }
  if (value.schemaVersion !== SCHEMA_VERSION)
    errors.push("Unsupported schema version.");
  if (!Number.isSafeInteger(value.revision) || value.revision < 0)
    errors.push("Invalid revision.");
  if (!validTime(value.updatedAt)) errors.push("Invalid update time.");
  const board = value.activeBoard;
  if (
    !exactKeys(board, ["id", "theme", "cards", "updatedAt"]) ||
    !validId(board.id) ||
    typeof board.theme !== "string" ||
    !validCards(board.cards) ||
    !validTime(board.updatedAt)
  ) {
    errors.push("Invalid active board.");
  }
  if (
    !exactKeys(value.settings, ["confirmDestructive"]) ||
    typeof value.settings.confirmDestructive !== "boolean"
  ) {
    errors.push("Invalid settings.");
  }
  if (!Array.isArray(value.histories)) {
    errors.push("Invalid histories.");
  } else {
    const ids = new Set();
    for (const snapshot of value.histories) {
      if (
        !exactKeys(snapshot, [
          "id",
          "boardId",
          "theme",
          "cards",
          "savedAt",
          "fingerprint",
        ]) ||
        !validId(snapshot.id) ||
        ids.has(snapshot.id) ||
        !validId(snapshot.boardId) ||
        typeof snapshot.theme !== "string" ||
        !validCards(snapshot.cards) ||
        !validTime(snapshot.savedAt) ||
        snapshot.fingerprint !== boardFingerprint(snapshot)
      ) {
        errors.push("Invalid history snapshot.");
        break;
      }
      ids.add(snapshot.id);
    }
  }
  return { valid: errors.length === 0, errors };
}

function checked(state) {
  const result = validateState(state);
  if (!result.valid) throw new TypeError(result.errors.join(" "));
}

function change(state, patch, options = {}) {
  if (state.revision === Number.MAX_SAFE_INTEGER)
    throw new RangeError("Revision limit reached.");
  return {
    ...state,
    ...patch,
    revision: state.revision + 1,
    updatedAt: timestamp(options),
  };
}

function changeBoard(state, patch, options = {}) {
  const now = timestamp(options);
  return change(
    state,
    {
      activeBoard: { ...state.activeBoard, ...patch, updatedAt: now },
    },
    { ...options, now },
  );
}

export function createEmptyState(options = {}) {
  const now = timestamp(options);
  return {
    schemaVersion: SCHEMA_VERSION,
    revision: 0,
    activeBoard: {
      id: newId(null, options),
      theme: "",
      cards: [],
      updatedAt: now,
    },
    histories: [],
    settings: { confirmDestructive: true },
    updatedAt: now,
  };
}

export function setTheme(state, theme, options = {}) {
  checked(state);
  if (typeof theme !== "string") throw new TypeError("Theme must be text.");
  if (state.activeBoard.theme === theme) return state;
  return changeBoard(state, { theme }, options);
}

export function insertCard(
  state,
  text,
  index = state.activeBoard.cards.length,
  options = {},
) {
  checked(state);
  const cards = [...state.activeBoard.cards];
  if (!Number.isInteger(index) || index < 0 || index > cards.length) {
    throw new RangeError("Insertion index is out of range.");
  }
  const normalizedText = cardText(text);
  cards.splice(index, 0, {
    id: newId(state, options),
    text: normalizedText,
    order: index,
  });
  return changeBoard(state, { cards: normalizeCards(cards) }, options);
}

export function updateCard(state, cardId, text, options = {}) {
  checked(state);
  const card = state.activeBoard.cards.find((entry) => entry.id === cardId);
  if (!card) throw new RangeError("Card not found.");
  const normalizedText = cardText(text);
  if (card.text === normalizedText) return state;
  return changeBoard(
    state,
    {
      cards: state.activeBoard.cards.map((entry) =>
        entry.id === cardId ? { ...entry, text: normalizedText } : entry,
      ),
    },
    options,
  );
}

export function moveCard(state, cardId, toIndex, options = {}) {
  checked(state);
  const cards = [...state.activeBoard.cards];
  const fromIndex = cards.findIndex((card) => card.id === cardId);
  if (fromIndex < 0) throw new RangeError("Card not found.");
  if (!Number.isInteger(toIndex) || toIndex < 0 || toIndex >= cards.length) {
    throw new RangeError("Destination index is out of range.");
  }
  if (fromIndex === toIndex) return state;
  const [card] = cards.splice(fromIndex, 1);
  cards.splice(toIndex, 0, card);
  return changeBoard(state, { cards: normalizeCards(cards) }, options);
}

export function removeCards(state, cardIds, options = {}) {
  checked(state);
  if (!Array.isArray(cardIds) && !(cardIds instanceof Set))
    throw new TypeError("Card IDs must be an array or Set.");
  const ids = new Set(cardIds);
  const cards = state.activeBoard.cards.filter((card) => !ids.has(card.id));
  if (cards.length === state.activeBoard.cards.length) return state;
  return changeBoard(state, { cards: normalizeCards(cards) }, options);
}

export function resetBoard(state, options = {}) {
  checked(state);
  return changeBoard(
    state,
    {
      id: newId(state, options),
      theme: options.keepTheme ? state.activeBoard.theme : "",
      cards: [],
    },
    options,
  );
}

/** Restore a prior active board for undo without rewinding saved histories/settings. */
export function replaceActiveBoard(state, board, options = {}) {
  checked(state);
  if (
    !exactKeys(board, ["id", "theme", "cards", "updatedAt"]) ||
    !validId(board.id) ||
    typeof board.theme !== "string" ||
    !validCards(board.cards) ||
    !validTime(board.updatedAt)
  ) {
    throw new TypeError("Invalid replacement board.");
  }
  return changeBoard(
    state,
    {
      id: board.id,
      theme: board.theme,
      cards: normalizeCards(board.cards),
    },
    options,
  );
}

export function saveSnapshot(state, options = {}) {
  checked(state);
  const fingerprint = boardFingerprint(state.activeBoard);
  if (state.histories.some((snapshot) => snapshot.fingerprint === fingerprint))
    return state;
  const snapshot = {
    id: newId(state, options),
    boardId: state.activeBoard.id,
    theme: state.activeBoard.theme,
    cards: normalizeCards(state.activeBoard.cards),
    savedAt: timestamp(options),
    fingerprint,
  };
  return change(state, { histories: [...state.histories, snapshot] }, options);
}

export function restoreSnapshot(state, snapshotId, options = {}) {
  checked(state);
  const snapshot = state.histories.find((entry) => entry.id === snapshotId);
  if (!snapshot) throw new RangeError("Snapshot not found.");
  return changeBoard(
    state,
    {
      id: newId(state, options),
      theme: snapshot.theme,
      cards: normalizeCards(snapshot.cards),
    },
    options,
  );
}

export function removeSnapshot(state, snapshotId, options = {}) {
  checked(state);
  const histories = state.histories.filter(
    (snapshot) => snapshot.id !== snapshotId,
  );
  if (histories.length === state.histories.length) return state;
  return change(state, { histories }, options);
}

export function setSettings(state, settings, options = {}) {
  checked(state);
  if (
    !exactKeys(settings, ["confirmDestructive"]) ||
    typeof settings.confirmDestructive !== "boolean"
  ) {
    throw new TypeError("Settings require confirmDestructive: true or false.");
  }
  if (settings.confirmDestructive === state.settings.confirmDestructive)
    return state;
  return change(state, { settings: { ...settings } }, options);
}
