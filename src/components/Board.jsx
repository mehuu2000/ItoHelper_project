import {
  DndContext,
  closestCenter,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Icon from "./Icon.jsx";

function Card({
  card,
  total,
  selectionMode,
  selected,
  onSelect,
  onEdit,
  onDelete,
  onMove,
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id, disabled: selectionMode });
  return (
    <article
      ref={setNodeRef}
      className={`card ${isDragging ? "dragging" : ""} ${selected ? "selected" : ""}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      aria-label={`カード${card.order + 1}: ${card.text}`}
    >
      <div className="card-paper">
        {selectionMode ? (
          <label className="card-select">
            <input
              type="checkbox"
              checked={selected}
              onChange={() => onSelect(card.id)}
              aria-label={`カード${card.order + 1}を選択`}
            />
            <span />
          </label>
        ) : (
          <button
            className="drag-handle"
            type="button"
            aria-label={`カード${card.order + 1}をドラッグして移動`}
            {...attributes}
            {...listeners}
          >
            <Icon name="grip" size={18} />
          </button>
        )}
        <div className="card-face">
          <span className="card-index">
            {String(card.order + 1).padStart(2, "0")}
          </span>
          <p className={card.text.length > 40 ? "long-text" : ""}>
            {card.text}
          </p>
          <span className="card-dot" />
        </div>
        <div className="fold-line" />
        <div className="card-face reverse" aria-hidden="true">
          <span className="card-index">
            {String(card.order + 1).padStart(2, "0")}
          </span>
          <p className={card.text.length > 40 ? "long-text" : ""}>
            {card.text}
          </p>
          <span className="card-dot" />
        </div>
      </div>
      <div className="card-actions">
        <button
          type="button"
          className="card-edit"
          onClick={() => onEdit(card)}
          disabled={selectionMode}
        >
          <Icon name="edit" size={14} />
          編集
        </button>
        <div>
          <button
            type="button"
            aria-label={`カード${card.order + 1}を左へ`}
            onClick={() => onMove(card.id, card.order - 1)}
            disabled={card.order === 0 || selectionMode}
          >
            <Icon name="left" size={16} />
          </button>
          <button
            type="button"
            aria-label={`カード${card.order + 1}を右へ`}
            onClick={() => onMove(card.id, card.order + 1)}
            disabled={card.order === total - 1 || selectionMode}
          >
            <Icon name="right" size={16} />
          </button>
          <button
            type="button"
            className="delete-card"
            aria-label={`カード${card.order + 1}を削除`}
            onClick={() => onDelete([card.id])}
            disabled={selectionMode}
          >
            <Icon name="trash" size={15} />
          </button>
        </div>
      </div>
    </article>
  );
}
function InsertSlot({ index, onInsert, hidden }) {
  return (
    <div className={`insert-slot ${hidden ? "slot-hidden" : ""}`}>
      <button
        type="button"
        aria-label={`${index + 1}番目の位置にカードを追加`}
        title="ここに追加"
        onClick={() => onInsert(index)}
        disabled={hidden}
      >
        <Icon name="plus" size={17} />
      </button>
    </div>
  );
}
export default function Board({
  cards,
  onInsert,
  onEdit,
  onDelete,
  onMove,
  selectionMode,
  selected,
  onSelect,
}) {
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 160, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const onDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const index = cards.findIndex((c) => c.id === over.id);
    if (index >= 0) onMove(active.id, index);
  };
  const label = (id) => cards.find((card) => card.id === id)?.text ?? "カード";
  const position = (id) => cards.findIndex((card) => card.id === id) + 1;
  const announcements = {
    onDragStart: ({ active }) =>
      `${position(active.id)}番目の「${label(active.id)}」を持ち上げました。`,
    onDragOver: ({ active, over }) =>
      over
        ? `「${label(active.id)}」を${position(over.id)}番目の位置へ移動できます。`
        : "カードの並びの外です。",
    onDragEnd: ({ active, over }) =>
      over
        ? `「${label(active.id)}」を${position(over.id)}番目に置きました。`
        : "移動をキャンセルしました。",
    onDragCancel: () => "移動をキャンセルしました。",
  };
  return (
    <div className="board-surface">
      <div className="scale">
        <span>
          <b>0</b>
          <small>小さい</small>
        </span>
        <div className="scale-line">
          <i />
          <i />
          <i />
          <i />
          <i />
        </div>
        <span>
          <b>100</b>
          <small>大きい</small>
        </span>
      </div>
      {cards.length === 0 ? (
        <div className="empty-board">
          <div className="empty-illustration" aria-hidden="true">
            <div className="ghost-card ghost-left">
              <i />
            </div>
            <div className="ghost-card ghost-right">
              <i />
            </div>
            <div className="empty-plus">
              <Icon name="plus" size={28} />
            </div>
          </div>
          <h2>カードがありません</h2>
          <p>宣言文を入力してカードを追加してください。</p>
          <button
            type="button"
            className="button primary"
            onClick={() => onInsert(0)}
          >
            <Icon name="plus" size={18} />
            最初のカードを追加
          </button>
          <span className="empty-footnote">数字の入力は不要です。</span>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
          accessibility={{
            announcements,
            screenReaderInstructions: {
              draggable:
                "スペースでカードを持ち上げ、左右矢印で移動。スペースで決定、Escapeでキャンセルします。",
            },
          }}
        >
          <div
            className="card-track"
            role="region"
            aria-label="ことばのカード一覧"
            tabIndex={0}
          >
            <SortableContext
              items={cards.map((c) => c.id)}
              strategy={horizontalListSortingStrategy}
            >
              <InsertSlot
                index={0}
                onInsert={onInsert}
                hidden={selectionMode}
              />
              {cards.map((card) => (
                <div className="card-and-slot" key={card.id}>
                  <Card
                    card={card}
                    total={cards.length}
                    selectionMode={selectionMode}
                    selected={selected.includes(card.id)}
                    onSelect={onSelect}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onMove={onMove}
                  />
                  <InsertSlot
                    index={card.order + 1}
                    onInsert={onInsert}
                    hidden={selectionMode}
                  />
                </div>
              ))}
            </SortableContext>
          </div>
        </DndContext>
      )}
      <div className="board-bottom-note">
        <span className="small-dot" />
        カードは上下両方向に表示します。
      </div>
    </div>
  );
}
