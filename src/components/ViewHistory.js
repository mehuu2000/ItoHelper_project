import React from 'react'
import styles from '../styles/components_styles/viewHistory.module.css'
import { useEffect, useState } from "react";



export default function ViewHistory( currentUser ) {
    const [historyData, setHistoryData] = useState([]);

    useEffect(() => {
        const fetchHistory = async () => {
          try {
            const response = await fetch("/api/getHistorys"); // API を呼び出す
            if (!response.ok) {
              throw new Error("データの取得に失敗しました");
            }
            const data = await response.json();
            console.log(currentUser);
            console.log(data);
            setHistoryData(data);
          } catch (error) {
            console.error("エラー:", error);
          }
        };
    
        fetchHistory();
    }, []);

    return (
        <div className={styles.view}>
          <h1 className={styles.h1}>履歴一覧</h1>
      
          {historyData.map((history) => (
            <div key={history.id} className={styles.contents}>
              <h3>お題: {history.theme}</h3>
              <p>形式: {history.game}</p>
      
              <div className={styles.cards}>
                {history.contents
                    .slice() // 元の配列を変更しないためにコピーを作成
                    .sort((a, b) => a.order - b.order) // order順にソート（昇順）
                    .map((card) => (
                    <div key={card.id}>{card.order}: {card.content}</div>
                    ))}
              </div>
            </div>
          ))}
        </div>
      );
}