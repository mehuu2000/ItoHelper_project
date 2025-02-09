import React, { useState } from 'react';
import Header from '../components/Header';
import TypeLocal from '../components/Local/TypeLocal';
import Footer from '../components/Footer';
import styles from '../styles/local.module.css';
import Head from "next/head";

export default function Local() {
    const [cards, setCards] = useState(["妄想世界での小鳥遊六花", "リムル", "アクセラレータ", "レミリア"]);
    return (
        <main>
            <div className={styles.view}>
                <Header gameName="ローカル"/>
                <TypeLocal cards={cards} setCards={setCards}/>
                <Footer />
            </div>
        </main>
    )
}