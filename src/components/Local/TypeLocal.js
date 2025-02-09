import React, { useEffect } from 'react';
import styles from '../../styles/components_styles/typeLocal.module.css';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
  } from '@dnd-kit/core';
  import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    horizontalListSortingStrategy,
  } from '@dnd-kit/sortable';
  import { SortableCard } from './SortableCard';

  export default function TypeLocal({ cards, setCards, isDelete, selectDelete, setSelectDelete }) {
    // useEffect(() => {
    //     console.log(cards);
    // }, [cards]);
    const sensors = useSensors(
        useSensor(PointerSensor, {
          activationConstraint: {
            delay: 250,
            tolerance: 10,
          },
        }),
        useSensor(KeyboardSensor, {
          coordinateGetter: sortableKeyboardCoordinates,
        })
      );
  
      const handleDragEnd = (event) => {
        if (isDelete) return; // 削除選択モード中はドラッグを無効化

        const { active, over } = event;
        
        if (active.id !== over.id) {
          setCards((items) => {
            const oldIndex = items.indexOf(active.id);
            const newIndex = items.indexOf(over.id);
            return arrayMove(items, oldIndex, newIndex);
          });
        }
      };
      
      const handleCardClick = (card) => {
        if (!isDelete) return;
        
        setSelectDelete(prev => {
          if (prev.includes(card)) {
            return prev.filter(id => id !== card);
          } else {
            return [...prev, card];
          }
        });
      }
    
      return (
        <div className={styles.view}>
          <div className={styles.wid}>
            <span className={styles.num}>0</span>
            <span className={styles.line}></span>
            <span className={styles.num}>100</span>
          </div>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <div className={styles.content}>
              <SortableContext
                items={cards}
                strategy={horizontalListSortingStrategy}
              >
                {cards.map((card, index) => (
                  <SortableCard
                    key={card}
                    id={card}
                    index={index}
                    card={card}
                    isDelete={isDelete}
                    isSelected={selectDelete.includes(card)}
                    onClick={() => handleCardClick(card)}
                  />
                ))}
              </SortableContext>
            </div>
          </DndContext>
        </div>
    );
  }