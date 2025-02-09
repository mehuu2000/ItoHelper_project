import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import styles from '../../styles/components_styles/typeLocal.module.css';

export function SortableCard({ id, index, card, isDelete, isSelected, onClick }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <button
      ref={setNodeRef}
      style={style}
      {...(!isDelete && { ...attributes, ...listeners })}
      className={`${styles.card} ${isDelete ? styles.deleteMode : ''} ${isSelected ? styles.selected : ''}`}
      data-dragging={isDragging}
      onClick={onClick}
    >
      <div className={styles.upright}>
        <p className={styles.number}>{index + 1}</p>
        <p className={styles.val}>{card}</p>
      </div>
      <span className={styles.border}></span>
      <div className={styles.reverse}>
        <p className={styles.number}>{index + 1}</p>
        <p className={styles.val}>{card}</p>
      </div>
    </button>
  );
}