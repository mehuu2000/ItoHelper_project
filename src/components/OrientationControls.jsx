import Icon from "./Icon.jsx";

export default function OrientationControls({ orientation }) {
  return (
    <div className="orientation-controls">
      <button
        className="button secondary"
        type="button"
        onClick={orientation.enter}
        disabled={orientation.busy}
      >
        <Icon name="expand" size={18} />
        {orientation.busy ? "切り替え中…" : "全画面で横向きにする"}
      </button>
      {(orientation.fullscreen || orientation.locked || orientation.busy) && (
        <button
          className="button secondary"
          type="button"
          onClick={orientation.exit}
        >
          横向き・全画面を解除
        </button>
      )}
      {orientation.message && <p role="status">{orientation.message}</p>}
    </div>
  );
}
