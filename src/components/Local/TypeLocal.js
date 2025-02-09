import React from 'react';
import styles from '../../styles/components_styles/typeLocal.module.css';

export default function TypeLocal({ cards, setCards }) {
    // console.log(cards);
    return(
        <div className={styles.view}>
            <div className={styles.wid}>
                <span className={styles.num}>0</span>
                <span className={styles.line}></span>
                <span className={styles.num}>100</span>
            </div>
            <div className={styles.content}>
                {cards.map((card, index) => {
                    return(
                        <button key={index} className={styles.card}>
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
                })}
            </div>
        </div>  
    )
}