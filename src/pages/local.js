import React, { useState } from 'react';
import Header from '../components/Header';
// import TypeLocal from '../components/Local/TypeLocal';
import Footer from '../components/Footer';
import styles from '../styles/local.module.css';
import Head from "next/head";
import dynamic from 'next/dynamic'

const TypeLocal = dynamic(() => import('../components/Local/TypeLocal'), {
  ssr: false // サーバーサイドレンダリングを無効化
})

export default function Local() {
    const [cards, setCards] = useState(["妄想世界での小鳥遊六花", "リムル", "アクセラレータ", "レミリア", "さいたま", "ギルガメッシュ", "アリア", "サカツキ 美優"]);
    const [isDelete, setIsDelete] = useState(false);
    const [selectDelete, setSelectDelete] = useState([]); //配列のidが入る
    
    const handleDelete = () => {
        const reMakeCards = cards.filter(card => !selectDelete.includes(card));
        setCards(reMakeCards); 
        setSelectDelete([]); 
    }

    return (
        <main>
            <div className={styles.view}>
                <Header gameName="ローカル"/>
                <TypeLocal 
                    cards={cards} 
                    setCards={setCards}
                    isDelete={isDelete}
                />
                <Footer 
                    cards={cards} 
                    setCards={setCards}
                    isDelete={isDelete}
                    setIsDelete={setIsDelete}
                    handleDelete={handleDelete}
                />
            </div>
        </main>
    )
}