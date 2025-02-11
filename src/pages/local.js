import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
// import TypeLocal from '../components/Local/TypeLocal';
import Footer from '../components/Footer';
import styles from '../styles/local.module.css';
import Head from "next/head";
import dynamic from 'next/dynamic'
import { useSession } from "next-auth/react";

import SettingPopup from '../components/SettingPopup';

const TypeLocal = dynamic(() => import('../components/Local/TypeLocal'), {
  ssr: false // サーバーサイドレンダリングを無効化
})

export default function Local() {
    const [cards, setCards] = useState(["犬", "ライオン", "車", "バス", "家", "アフリカゾウ", "恐竜（ティラノサウルス）", "コンテナ船", "ビル（ブルジュ・ハリファ）", "飛行機（ボーイング747）", "クジラ", "エベレスト山", "太陽", "銀河系", "宇宙"]);
    const [isDelete, setIsDelete] = useState(false);
    const [selectDelete, setSelectDelete] = useState([]); 
    const [ theme, setTheme ] = useState("");
    const [isInsert, setIsInsert] = useState(false);
    const [newValue, setNewValue] = useState("");
    const [isInserting, setIsInserting] = useState(false);
    const [insertPosition, setInsertPosition] = useState(null);
    const [isSetting, setIsSetting] = useState(false);
    const [isColor, setIsColor] = useState(false);
    const [playerCount, setPlayerCount] = useState("");

    const [isCheck, setIsCheck] = useState(true);
    const handleSwitchChange = (event) => {
        setIsCheck(event.target.checked);
    };
    const handleSwitchColor = (event) => {
        setIsColor(event.target.checked);
    };

    useEffect(() => {
            console.log(`isInsert: ${isInsert}`);
            console.log(`isDelete: ${isDelete}`);
            console.log(`isInserting: ${isInserting}`);
            console.log("----------------------");
    }, [isDelete, isInsert, isInserting]);

    useEffect(() => {
        console.log(`insertPosition: ${insertPosition}`)
    }, [insertPosition]);

    const openSetting = () => {
        setIsSetting(true);
    }
    const closeSetting = () => {
        setIsSetting(false);
    }

    //ログイン判断
    const { data: session, status } = useSession();
    const [currentUser, setCurrentUser] = useState(null);
    useEffect(() => {
        if (status === "authenticated") {
          setCurrentUser(session.user); // 認証されていれば、currentUserを設定
        }
    }, [session, status]);
    //

    const handleDelete = () => {
        const reMakeCards = cards.filter(card => !selectDelete.includes(card));
        setCards(reMakeCards); 
        setSelectDelete([]); 
    }

    const handleDeleteCansel = () => {
        setIsDelete(!isDelete);
        setSelectDelete([]);
    }

    const handleClear = () => {
        setCards([]);
        setSelectDelete([]); 
    }

    //挿入処理
    const handleInsertCansel = () => {
        setIsInsert(false); // 挿入モードを解除
        setSelectDelete([]);
        setIsInserting(false); // 挿入用のフラグも解除
        setInsertPosition(null); // 挿入位置をリセット
        setNewValue(""); // 入力値もリセット
    }

    // 挿入処理の開始
    const handleInsertStart = () => {
        const indexes = selectDelete.map(item => cards.indexOf(item)).sort((a, b) => a - b);
        console.log(indexes);
    
        if (indexes.length === 1) {
            const index = indexes[0];
            if (index === 0) {
                setInsertPosition(0); // 左端に挿入
                setIsInserting(true);
            } else if (index === cards.length - 1) {
                setInsertPosition(cards.length); // 右端に挿入
                setIsInserting(true);
            } else {
                console.log("端のカードではありません");
                handleInsertCansel();
                // return;
            }
        } else if (indexes.length === 2) {
            const [index1, index2] = indexes;
            if (index1 + 1 === index2) {
                setInsertPosition(index2); // 隣り合っているなら間に挿入
                setIsInserting(true);
            } else {
                console.log("選択された要素が隣接していません。");
                handleInsertCansel();
                // return;
            }
        } else {
            console.log("二つまで選択できます");
            handleInsertCansel();
        }
    
        // if (insertPosition !== null) {
        //     console.log("挿入モード開始");
        //     setIsInserting(true); // 挿入モード開始
        // }
    };

    // 完了ボタンを押したときの挿入処理
    const handleInsertConfirm = () => {
        if (!newValue) {
            console.log("値を入力してください");
            return;
        };

        const newCards = [...cards];
        newCards.splice(insertPosition, 0, newValue);

        setCards(newCards);
        setIsInserting(false);
        setInsertPosition(null);
        setSelectDelete([]);
        setNewValue("");
    };

    const fin = async () => {
        if (!currentUser || !currentUser.id) {
            console.error("ユーザーが認証されていない、またはIDが取得できません。", currentUser);
            return { error: "ユーザーが認証されていません。" };
        }

        const currentId = currentUser.id;
        console.log("送信データ:", { currentId, game: "local", theme, cards });
        
        try {
            const response = await fetch('/api/makeGame', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ currentId, game: "local", theme, cards }),
            });
            
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || "登録に失敗しました。");
            }
            console.log("ゲーム履歴の登録成功:", data.history);
            return data;
        } catch (error) {
            console.error("ゲーム登録エラー:", error);
            return { error: error.message || "サーバーエラー" };
        }
    }
    // const fin = () => {
    //     console.log(currentUser.id);
    // }

    return (
        <main>
            <div className={styles.view}>
                <Header 
                    gameName="レインボー" 
                    currentUser={currentUser}
                    status={status}
                    theme={theme}
                    setTheme={setTheme}
                    openSetting={openSetting}
                />
                <TypeLocal 
                    cards={cards} 
                    setCards={setCards}
                    isDelete={isDelete}
                    selectDelete={selectDelete}
                    setSelectDelete={setSelectDelete}
                    isInsert={isInsert}
                />
                {/* 挿入モード時に表示する入力フォーム */}
                {isInserting && (
                    <div>
                        <input 
                            type="text" 
                            value={newValue} 
                            onChange={(e) => setNewValue(e.target.value)}
                            placeholder="新しいカードを入力"
                        />
                        <button onClick={handleInsertConfirm}>完了</button>
                        <button onClick={handleInsertCansel}>キャンセル</button>
                    </div>
                )}
                <Footer 
                    cards={cards} 
                    setCards={setCards}
                    isDelete={isDelete}
                    setIsDelete={setIsDelete}
                    handleDelete={handleDelete}
                    handleDeleteCansel={handleDeleteCansel}
                    handleClear={handleClear}
                    fin={fin}
                    currentUser={currentUser}
                    isInsert={isInsert}
                    setIsInsert={setIsInsert}
                    handleInsertCard={handleInsertStart}
                    handleInsertCansel={handleInsertCansel}
                    isInserting={isInserting}
                    isCheck={isCheck}
                />
                 <SettingPopup 
                    open={isSetting} 
                    onClose={closeSetting} 
                    isColor={isColor} 
                    handleSwitchColor={handleSwitchColor}
                    isCheck={isCheck}
                    handleSwitchChange={handleSwitchChange}
                    playerCount={playerCount}
                    setPlayerCount={setPlayerCount}
                />
            </div>
        </main>
    )
}