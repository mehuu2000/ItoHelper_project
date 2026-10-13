import { useEffect, useRef, useState } from "react";
import Board from "./components/Board.jsx";
import Dialog from "./components/Dialog.jsx";
import Icon from "./components/Icon.jsx";
import OrientationNotice from "./components/OrientationNotice.jsx";
import RulesHelp from "./components/RulesHelp.jsx";
import OrientationControls from "./components/OrientationControls.jsx";
import { useScreenOrientation } from "./hooks/useScreenOrientation.js";
import { useLocalBoard } from "./hooks/useLocalBoard.js";
import {
  insertCard,
  updateCard,
  moveCard,
  removeCards,
  resetBoard,
  saveSnapshot,
  restoreSnapshot,
  setTheme,
  setSettings,
  removeSnapshot,
  replaceActiveBoard,
} from "./lib/board-model.js";
import { exportState, importState } from "./lib/local-store.js";

const readView = () =>
  window.location.hash === "#history" ? "history" : "board";
const formatDate = (value) =>
  new Intl.DateTimeFormat("ja-JP", {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
function download(content, filename) {
  const url = URL.createObjectURL(
    new Blob([content], { type: "application/json;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function CardEditor({ editor, onClose, onSave }) {
  const [text, setText] = useState(editor.text ?? "");
  const [error, setError] = useState("");
  const submit = (event) => {
    event.preventDefault();
    if (!text.trim()) {
      setError("ことばを入力してください。");
      return;
    }
    onSave(text.trim());
  };
  return (
    <Dialog
      title={editor.kind === "edit" ? "ことばを編集" : "カードを追加"}
      eyebrow={
        editor.kind === "add" ? `${editor.index + 1}番目の位置` : undefined
      }
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <label className="field-label" htmlFor="card-text">
          カードにたとえたことば
        </label>
        <textarea
          id="card-text"
          autoFocus
          value={text}
          rows={4}
          placeholder="例：休日の朝の二度寝"
          onChange={(e) => {
            setText(e.target.value);
            setError("");
          }}
          onKeyDown={(e) => {
            if (
              e.key === "Enter" &&
              !e.shiftKey &&
              !e.nativeEvent.isComposing &&
              e.keyCode !== 229
            )
              submit(e);
          }}
          aria-describedby="card-input-hint"
        />
        <div className="field-hint" id="card-input-hint">
          <span>Enterで決定 · Shift＋Enterで改行</span>
          <span>{text.length}文字</span>
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <p className="quiet-note">
          同じことばのカードも追加できます。数字の入力は不要です。
        </p>
        <div className="dialog-actions">
          <button className="button secondary" type="button" onClick={onClose}>
            キャンセル
          </button>
          <button className="button primary" type="submit">
            <Icon name={editor.kind === "edit" ? "check" : "plus"} size={18} />
            {editor.kind === "edit" ? "変更する" : "追加する"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

export default function App() {
  const orientation = useScreenOrientation();
  const data = useLocalBoard();
  const { state, status, issue } = data;
  const board = state.activeBoard;
  const [view, setView] = useState(readView);
  const [editor, setEditor] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [detail, setDetail] = useState(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selected, setSelected] = useState([]);
  const [toast, setToast] = useState(null);
  const [undo, setUndo] = useState(null);
  const [historyQuery, setHistoryQuery] = useState("");
  const fileRef = useRef(null);
  const toastTimer = useRef(null);
  const isFile = window.location.protocol === "file:";
  useEffect(() => {
    const fn = () => {
      setView(readView());
      setSelected([]);
      setSelectionMode(false);
    };
    window.addEventListener("hashchange", fn);
    return () => window.removeEventListener("hashchange", fn);
  }, []);
  useEffect(() => () => clearTimeout(toastTimer.current), []);
  useEffect(() => {
    setUndo((current) =>
      current && current.afterBoard !== board ? null : current,
    );
  }, [board]);
  const notify = (message, error = false) => {
    clearTimeout(toastTimer.current);
    setToast({ message, error });
    toastTimer.current = setTimeout(() => setToast(null), 5000);
  };
  const navigate = (next) => {
    data.flush();
    setView(next);
    window.location.hash = next;
    setSelectionMode(false);
    setSelected([]);
  };
  const withUndo = (fn, message) => {
    const previous = structuredClone(board);
    try {
      const result = data.update(fn);
      if (result.changed) {
        setUndo({
          board: previous,
          afterBoard: result.state.activeBoard,
          label: message,
        });
        notify(
          result.saved ? message : `${message}（端末には未保存）`,
          !result.saved,
        );
      }
    } catch {
      notify("操作を完了できませんでした。もう一度お試しください。", true);
    }
  };
  const remove = (ids) => {
    if (!ids.length) return;
    const action = () => {
      withUndo(
        (current) => removeCards(current, ids),
        `${ids.length}枚のカードを削除しました`,
      );
      setSelected([]);
      setSelectionMode(false);
    };
    if (state.settings.confirmDestructive)
      setConfirm({
        title: `${ids.length}枚のカードを削除しますか？`,
        message:
          "削除後は「元に戻す」で取り消せます。保存済みの履歴は残ります。",
        label: "削除する",
        danger: true,
        action,
      });
    else action();
  };
  const reset = () => {
    const action = () => {
      withUndo(
        (current) => resetBoard(current, { keepTheme: true }),
        "カードをリセットしました",
      );
      setSelected([]);
      setSelectionMode(false);
    };
    if (state.settings.confirmDestructive)
      setConfirm({
        title: "カードをリセットしますか？",
        message: "お題と保存済みの履歴は残ります。カードだけを空にします。",
        label: "リセットする",
        danger: true,
        action,
      });
    else action();
  };
  const save = () => {
    const result = data.update((current) => saveSnapshot(current));
    if (!result.changed)
      notify(
        result.saved
          ? "この内容はすでに履歴に保存されています"
          : "同じ履歴がありますが、端末には未保存です。書き出しで保管してください。",
        !result.saved,
      );
    else
      notify(
        result.saved
          ? "このボードを履歴に保存しました"
          : "履歴を作成しましたが、端末に保存できません。書き出しで保管してください。",
        !result.saved,
      );
  };
  const exportBackup = () => {
    data.flush();
    download(
      exportState(state),
      `ito-helper-${new Date().toISOString().slice(0, 10)}.json`,
    );
    notify("バックアップを書き出しました");
  };
  const importBackup = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const next = importState(await file.text());
      const expectedRaw = data.currentRaw();
      setDialog(null);
      setConfirm({
        title: "バックアップを読み込みますか？",
        message: `カード${next.activeBoard.cards.length}枚・履歴${next.histories.length}件が含まれています。現在のボードと履歴を置き換えます。必要な内容は先に書き出してください。`,
        label: "読み込んで置き換える",
        action: () => {
          const result = data.importReplacement(next, expectedRaw);
          if (result.loaded) {
            setUndo(null);
            setSelected([]);
            setSelectionMode(false);
            notify(
              result.saved
                ? "バックアップを読み込みました"
                : "バックアップを画面に読み込みました。端末には未保存です。",
              !result.saved,
            );
          } else
            notify(
              "読み込めませんでした。保存先の状態を確認してください。",
              true,
            );
        },
      });
    } catch {
      notify(
        "読み込めませんでした。Ito Helperで書き出したJSONファイルを選んでください。",
        true,
      );
    }
  };
  const restore = (snapshot) =>
    setConfirm({
      title: "この履歴をボードに戻しますか？",
      message:
        "現在のボードを置き換えます。必要なら先に履歴へ保存してください。保存済みの履歴は残ります。",
      label: "ボードに戻す",
      action: () => {
        withUndo(
          (current) => restoreSnapshot(current, snapshot.id),
          "履歴をボードに戻しました",
        );
        setDetail(null);
        navigate("board");
      },
    });
  const recover = () => {
    const expectedRaw = data.currentRaw();
    setConfirm({
      title: "現在の画面の内容で保存を再開しますか？",
      message:
        "端末に残っているデータを置き換えます。元データが必要な場合は、先に書き出してください。この操作は取り消せません。",
      label: "この内容で保存する",
      danger: true,
      action: () => {
        if (data.replace(state, expectedRaw))
          notify("端末への保存を再開しました");
        else
          notify(
            "保存できませんでした。画面を閉じる前に書き出してください。",
            true,
          );
      },
    });
  };
  const issueText = {
    corrupt:
      "保存データを読み込めませんでした。元データは上書きせずに残しています。",
    unsupported:
      "保存データの形式がこのバージョンに対応していません。元データは残しています。",
    unavailable:
      "このブラウザでは端末保存が利用できません。画面を閉じる前に書き出してください。",
    write:
      "端末に保存できませんでした。空き容量やブラウザの設定を確認し、書き出しで保管してください。",
    conflict:
      "別のタブでデータが変更されました。上書きを防ぐため、自動保存を停止しています。",
  };
  const histories = [...state.histories]
    .reverse()
    .filter((item) =>
      `${item.theme} ${item.cards.map((c) => c.text).join(" ")}`
        .toLowerCase()
        .includes(historyQuery.toLowerCase()),
    );

  return (
    <div className="app-shell">
      <header className="app-header">
        <a
          className="brand"
          href="#board"
          onClick={() => navigate("board")}
          aria-label="Ito Helper ボードへ"
        >
          <span className="brand-mark" aria-hidden="true">
            <i />
            <i />
          </span>
          <span>
            Ito<span className="brand-light">Helper</span>
          </span>
        </a>
        <nav className="main-nav" aria-label="メイン">
          <button
            className={view === "board" ? "active" : ""}
            onClick={() => navigate("board")}
          >
            <Icon name="board" size={17} />
            ボード
          </button>
          <button
            className={view === "history" ? "active" : ""}
            onClick={() => navigate("history")}
          >
            <Icon name="history" size={18} />
            履歴
            {state.histories.length > 0 && (
              <span className="nav-count">{state.histories.length}</span>
            )}
          </button>
        </nav>
        <div className="header-tools">
          <button
            className="help-button"
            aria-label="遊び方"
            title="遊び方"
            onClick={() => setDialog("help")}
          >
            <Icon name="help" size={18} />
            <span>遊び方</span>
          </button>
          <button
            className="icon-button"
            aria-label="設定とバックアップ"
            title="設定とバックアップ"
            onClick={() => setDialog("settings")}
          >
            <Icon name="settings" />
          </button>
        </div>
      </header>
      <main>
        {isFile && (
          <div className="preview-notice">
            <Icon name="help" size={15} />
            <span>
              ファイルプレビューです。端末保存の動作はブラウザにより異なります。普段は同じURLでの静的配信をご利用ください。
            </span>
          </div>
        )}
        {issue && (
          <section className="storage-alert" role="alert">
            <Icon name="alert" size={21} />
            <div>
              <strong>画面の内容は、端末に保存されていません</strong>
              <p>{issueText[issue]}</p>
              <div className="alert-actions">
                <button onClick={exportBackup}>画面の内容を書き出す</button>
                {["corrupt", "unsupported", "conflict"].includes(issue) && (
                  <>
                    <button
                      onClick={() => {
                        const raw = data.currentRaw();
                        if (typeof raw === "string")
                          download(raw, "ito-helper-original-data.json");
                        else notify("元データを取得できませんでした。", true);
                      }}
                    >
                      元データを書き出す
                    </button>
                    <button onClick={recover}>この内容で保存を再開</button>
                  </>
                )}
                {issue === "conflict" ? (
                  <button
                    onClick={() =>
                      setConfirm({
                        title: "別のタブの内容を読み込みますか？",
                        message:
                          "現在の画面にある未保存の変更は失われます。必要なら先に書き出してください。",
                        label: "読み込み直す",
                        action: () => {
                          data.reload();
                          setUndo(null);
                          setSelected([]);
                          setSelectionMode(false);
                        },
                      })
                    }
                  >
                    保存済みの内容を読み込む
                  </button>
                ) : (
                  !["corrupt", "unsupported"].includes(issue) && (
                    <button
                      onClick={() => {
                        const ok = data.retry();
                        notify(
                          ok
                            ? "端末に保存しました"
                            : "まだ保存できません。書き出しで保管してください。",
                          !ok,
                        );
                      }}
                    >
                      保存を再試行
                    </button>
                  )
                )}
              </div>
            </div>
          </section>
        )}
        <div className="page-intro">
          <div>
            <h1>{view === "board" ? "ボード" : "履歴"}</h1>
          </div>
          <div
            className={`save-indicator ${status === "error" ? "unsaved" : ""}`}
            role="status"
          >
            <span className="status-dot" />
            {status === "saved"
              ? "この端末に自動保存"
              : status === "saving"
                ? "保存しています…"
                : "未保存の変更があります"}
            <small>このブラウザだけに保存</small>
          </div>
        </div>
        {view === "board" ? (
          <>
            <section className="theme-panel" aria-label="お題">
              <div className="theme-symbol">
                <Icon name="sun" size={23} />
              </div>
              <div className="theme-field">
                <label htmlFor="theme">お題</label>
                <input
                  id="theme"
                  type="text"
                  value={board.theme}
                  placeholder="お題を入力（例：うれしいこと）"
                  onChange={(event) =>
                    data.update(
                      (current) => setTheme(current, event.target.value),
                      { defer: true },
                    )
                  }
                  onBlur={data.flush}
                  autoComplete="off"
                />
              </div>
              <Icon name="edit" size={18} />
            </section>
            {!board.theme && (
              <div className="theme-suggestions">
                <span>たとえば</span>
                {["うれしいこと", "こわいもの", "旅行で行きたい場所"].map(
                  (text) => (
                    <button
                      type="button"
                      key={text}
                      onClick={() =>
                        data.update((current) => setTheme(current, text))
                      }
                    >
                      {text}
                      <Icon name="plus" size={12} />
                    </button>
                  ),
                )}
              </div>
            )}
            <section className="play-section" aria-label="カードボード">
              <div className="board-toolbar">
                <div className="board-label">
                  <span className="card-count">
                    {board.cards.length}
                    <small>枚</small>
                  </span>
                </div>
                <div className="board-tools">
                  <span className="drag-tip">
                    <Icon name="grip" size={14} />
                    つまんで並べ替え
                  </span>
                  <button
                    className={`text-button ${selectionMode ? "is-active" : ""}`}
                    disabled={!board.cards.length}
                    onClick={() => {
                      setSelectionMode(!selectionMode);
                      setSelected([]);
                    }}
                  >
                    {selectionMode ? "選択をやめる" : "カードを選択"}
                  </button>
                  <button
                    className="button primary compact"
                    onClick={() =>
                      setEditor({ kind: "add", index: board.cards.length })
                    }
                  >
                    <Icon name="plus" size={17} />
                    カードを追加
                  </button>
                </div>
              </div>
              <Board
                cards={board.cards}
                onInsert={(index) => setEditor({ kind: "add", index })}
                onEdit={(card) =>
                  setEditor({ kind: "edit", id: card.id, text: card.text })
                }
                onDelete={remove}
                onMove={(id, index) =>
                  data.update((current) => moveCard(current, id, index))
                }
                selectionMode={selectionMode}
                selected={selected}
                onSelect={(id) =>
                  setSelected((current) =>
                    current.includes(id)
                      ? current.filter((value) => value !== id)
                      : [...current, id],
                  )
                }
              />
              <div className="board-footer">
                <div className="board-footer-left">
                  <button
                    className="text-button muted"
                    disabled={!board.cards.length}
                    onClick={reset}
                  >
                    <Icon name="reset" size={16} />
                    カードをリセット
                  </button>
                  {undo && (
                    <button
                      className="text-button"
                      onClick={() => {
                        data.update((current) =>
                          replaceActiveBoard(current, undo.board),
                        );
                        setUndo(null);
                        setSelected([]);
                        setSelectionMode(false);
                        notify("元に戻しました");
                      }}
                    >
                      <Icon name="undo" size={16} />
                      元に戻す
                    </button>
                  )}
                </div>
                <button
                  className="button secondary"
                  disabled={!board.cards.length}
                  onClick={save}
                >
                  <Icon name="save" size={17} />
                  このボードを履歴に保存
                </button>
              </div>
            </section>
            {selectionMode && (
              <div className="selection-bar">
                <strong>{selected.length}枚を選択中</strong>
                <button
                  className="text-button"
                  onClick={() =>
                    setSelected(
                      selected.length === board.cards.length
                        ? []
                        : board.cards.map((c) => c.id),
                    )
                  }
                >
                  {selected.length === board.cards.length
                    ? "すべて解除"
                    : "すべて選択"}
                </button>
                <button
                  className="button danger compact"
                  disabled={!selected.length}
                  onClick={() => remove(selected)}
                >
                  <Icon name="trash" size={16} />
                  選択したカードを削除
                </button>
              </div>
            )}
            <div className="little-guide">
              <span className="guide-number">01</span>
              <span>1枚ずつ宣言</span>
              <Icon name="arrow" size={15} />
              <span className="guide-number">02</span>
              <span>実物を裏向きで置く</span>
              <Icon name="arrow" size={15} />
              <span className="guide-number">03</span>
              <span>同じ位置に登録</span>
              <button onClick={() => setDialog("help")}>
                遊び方
                <Icon name="right" size={14} />
              </button>
            </div>
          </>
        ) : (
          <section className="history-section">
            <div className="history-toolbar">
              <p>
                <strong>{state.histories.length}</strong>件の履歴
              </p>
              <input
                type="search"
                value={historyQuery}
                placeholder="お題やことばを検索"
                aria-label="履歴を検索"
                onChange={(e) => setHistoryQuery(e.target.value)}
              />
            </div>
            {histories.length === 0 ? (
              <div className="history-empty">
                <span className="history-empty-icon">
                  <Icon name="history" size={34} />
                </span>
                <h2>
                  {historyQuery
                    ? "一致する履歴がありません"
                    : "保存した履歴はありません"}
                </h2>
                <p>
                  {historyQuery
                    ? "検索条件を変更してください。"
                    : "ボードの「このボードを履歴に保存」で保存できます。"}
                </p>
                {!historyQuery && (
                  <button
                    className="button secondary"
                    onClick={() => navigate("board")}
                  >
                    ボードへ戻る
                    <Icon name="arrow" size={16} />
                  </button>
                )}
              </div>
            ) : (
              <div className="history-grid">
                {histories.map((snapshot) => (
                  <article className="history-card" key={snapshot.id}>
                    <div className="history-card-meta">
                      <span>{formatDate(snapshot.savedAt)}</span>
                      <span>{snapshot.cards.length}枚</span>
                    </div>
                    <h2>{snapshot.theme || "お題なし"}</h2>
                    <div className="history-card-words">
                      {snapshot.cards.slice(0, 4).map((card) => (
                        <span key={card.id}>
                          <b>{card.order + 1}</b>
                          {card.text}
                        </span>
                      ))}
                      {snapshot.cards.length > 4 && (
                        <small>ほか {snapshot.cards.length - 4}枚</small>
                      )}
                    </div>
                    <div className="history-card-actions">
                      <button
                        className="text-button"
                        onClick={() => setDetail(snapshot)}
                      >
                        記録を見る
                        <Icon name="arrow" size={15} />
                      </button>
                      <button
                        className="icon-button"
                        aria-label={`${snapshot.theme || "お題なし"}の履歴を削除`}
                        onClick={() =>
                          setConfirm({
                            title: "この履歴を削除しますか？",
                            message:
                              "この履歴は元に戻せません。必要なら先にバックアップを書き出してください。現在のボードには影響しません。",
                            label: "履歴を削除する",
                            danger: true,
                            action: () => {
                              const result = data.update((current) =>
                                removeSnapshot(current, snapshot.id),
                              );
                              notify(
                                result.saved
                                  ? "履歴を削除しました"
                                  : "削除の変更を端末に保存できませんでした。",
                                !result.saved,
                              );
                            },
                          })
                        }
                      >
                        <Icon name="trash" size={16} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
      <footer className="app-footer">
        <span>物理カードで遊ぶitoのための補助ツール</span>
        <button onClick={() => setDialog("settings")}>
          <Icon name="download" size={14} />
          バックアップ
        </button>
      </footer>
      {editor && (
        <CardEditor
          key={`${editor.kind}-${editor.id ?? editor.index}`}
          editor={editor}
          onClose={() => setEditor(null)}
          onSave={(text) => {
            try {
              const result = data.update((current) =>
                editor.kind === "edit"
                  ? updateCard(current, editor.id, text)
                  : insertCard(current, text, editor.index),
              );
              setEditor(null);
              notify(
                result.saved
                  ? editor.kind === "edit"
                    ? "ことばを変更しました"
                    : "カードを追加しました"
                  : "画面に反映しました。端末には未保存です。",
                !result.saved,
              );
            } catch {
              notify(
                "カードを保存できませんでした。もう一度お試しください。",
                true,
              );
            }
          }}
        />
      )}
      {confirm && (
        <Dialog title={confirm.title} onClose={() => setConfirm(null)}>
          <p className="dialog-copy">{confirm.message}</p>
          <div className="dialog-actions">
            <button
              className="button secondary"
              onClick={() => setConfirm(null)}
            >
              キャンセル
            </button>
            <button
              className={`button ${confirm.danger ? "danger" : "primary"}`}
              onClick={() => {
                const action = confirm.action;
                setConfirm(null);
                action();
              }}
            >
              {confirm.label}
            </button>
          </div>
        </Dialog>
      )}
      {dialog === "help" && <RulesHelp onClose={() => setDialog(null)} />}
      {dialog === "settings" && (
        <Dialog title="設定とバックアップ" onClose={() => setDialog(null)}>
          <h3 className="settings-title">画面の向き</h3>
          <OrientationControls orientation={orientation} />
          <div className="settings-divider" />
          <div className="setting-row">
            <div>
              <strong>カードの削除・リセットを確認</strong>
              <p>操作する前に、確認画面を表示します。</p>
            </div>
            <input
              className="switch"
              type="checkbox"
              role="switch"
              checked={state.settings.confirmDestructive}
              onChange={(e) =>
                data.update((current) =>
                  setSettings(current, {
                    confirmDestructive: e.target.checked,
                  }),
                )
              }
              aria-label="カードの削除・リセット前に確認する"
            />
          </div>
          <div className="settings-divider" />
          <h3 className="settings-title">バックアップ</h3>
          <p className="dialog-copy">
            データはこの端末の、このブラウザだけに保存されます。ブラウザのデータ消去やプライベートモードでは失われることがあります。
          </p>
          <div className="backup-buttons">
            <button className="button secondary" onClick={exportBackup}>
              <Icon name="download" size={18} />
              書き出す
            </button>
            <button
              className="button secondary"
              onClick={() => fileRef.current?.click()}
            >
              <Icon name="upload" size={18} />
              読み込む
            </button>
          </div>
          <div className="info-box">
            端末やブラウザを変えるときは、JSONファイルを書き出してから読み込んでください。ログインやクラウドへの送信はありません。
          </div>
          <p className="quiet-note">
            端末保存と、アプリをオフラインで開けることは別です。インターネットなしでの起動は保証していません。
          </p>
        </Dialog>
      )}
      {detail && (
        <Dialog
          title={detail.theme || "お題なし"}
          eyebrow={`${formatDate(detail.savedAt)} · ${detail.cards.length}枚`}
          wide
          onClose={() => setDetail(null)}
        >
          <ol className="history-detail">
            {detail.cards.map((card) => (
              <li key={card.id}>
                <span>{String(card.order + 1).padStart(2, "0")}</span>
                <p>{card.text}</p>
              </li>
            ))}
          </ol>
          <div className="dialog-actions">
            <button
              className="button secondary"
              onClick={() => setDetail(null)}
            >
              閉じる
            </button>
            <button className="button primary" onClick={() => restore(detail)}>
              <Icon name="undo" size={16} />
              ボードに戻す
            </button>
          </div>
        </Dialog>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        onChange={importBackup}
        hidden
        aria-label="バックアップファイル"
      />
      <OrientationNotice orientation={orientation} />
      {toast && (
        <div
          className={`toast ${toast.error ? "toast-error" : ""}`}
          role={toast.error ? "alert" : "status"}
        >
          <Icon name={toast.error ? "alert" : "check"} size={18} />
          <span>{toast.message}</span>
          <button aria-label="通知を閉じる" onClick={() => setToast(null)}>
            <Icon name="close" size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
