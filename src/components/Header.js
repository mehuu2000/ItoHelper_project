import React from 'react'
import styles from '../styles/components_styles/Header.module.css';
import { useRouter } from "next/router";
import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import Popup from '../components/Popup';

//MUI
import MenuIcon from '@mui/icons-material/Menu';
import KeyboardReturnIcon from '@mui/icons-material/KeyboardReturn';
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';

export default function Header({gameName}) {
    const router = useRouter();
    
    const { data: session, status } = useSession();
    const [ currentUser, setCurrentUser] = useState(null);
    // const [ isClient, setIsClient] = useState(false);
    const [ topic, setTopic ] = useState("");

    // const [showPopup, setShowPopup] = useState(false);
    // const [popupContent, setPopupContent] = useState("");

    const handleBack = () => {
        router.back(); //ひとつ前に戻る
    };

    const sendLogin = () => {
        router.push("/");
    }

    const spanRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        if (status === "authenticated") {
            setCurrentUser(session.user); // 認証されていれば、currentUserを設定
        }
    }, [session, status]);

    // const handlePopClose = () => {
    //     setShowPopup(false);
    // };

    const handleChangeTopic = (e) => {
        setTopic(e.target.value);
    }
    useEffect(() => {
        if (spanRef.current && inputRef.current) {
            // hiddenSpan の幅を取得して input の幅を更新
            inputRef.current.style.width = `${spanRef.current.offsetWidth + 10}px`;
        }
    }, [topic]);

    //メニュー
    const [anchorEl, setAnchorEl] = useState(null);
    const open = Boolean(anchorEl);
    const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
    };
    const handleClose = () => {
    setAnchorEl(null);
    };
    ////

    const [isFullscreen, setIsFullscreen] = useState(false);
    //フルスクリーン適応
    const enterFullscreen = () => {
    if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen();
        setIsFullscreen(true);
    }
    };

    //フルスクリーン解除
    const exitFullscreen = () => {
    if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
        document.exitFullscreen();
    }
    };
    ////

    //横向きに適応
    const lockToLandscape = async () => {
    if (!screen.orientation || !screen.orientation.lock) {
        alert("このブラウザでは横向き固定がサポートされていません。");
        return;
    }
    
    try {
        await screen.orientation.lock("landscape");
        console.log("横向きにしました");
    } catch (error) {
        console.error("横向きの変更に失敗しました:", error);
        alert("横向きにできませんでした。あなたのデバイス設定で画面ロックを解除し、ご自分で横向きにしてください");
    }
    };
    ////

    if (status === "loading") {
        return <p>読み込み中...</p>; // 読み込み中の表示
    };


    return (
        <header className={styles.header}>
            <button onClick={handleBack}><KeyboardReturnIcon sx={{ width: '25px', height: '25px', color: 'white' }} /></button>
            <div className={styles.title}>
                <span ref={spanRef} className={styles.hiddenSpan} aria-hidden="true">
                    {topic || "お題"}
                </span>
                
                <input 
                    ref={inputRef}
                    type="text"
                    placeholder="お題"
                    className={styles.input}
                    value={topic}
                    onChange={handleChangeTopic}
                />
                <span className={styles.rule}> | {gameName}</span>
            </div>
            <div className={styles.menu}>
                <p className={styles.islogin}>
                    {currentUser ? "ログイン中" : "未ログイン"}
                </p>
                <Button
                    id="basic-button"
                    aria-controls={open ? 'basic-menu' : undefined}
                    aria-haspopup="true"
                    aria-expanded={open ? 'true' : undefined}
                    onClick={handleClick}
                >
                    <MenuIcon sx={{ width: '25px', height: '25px',color: 'white' }}/>
                </Button>
                <Menu
                    id="basic-menu"
                    anchorEl={anchorEl}
                    open={open}
                    onClose={handleClose}
                    MenuListProps={{
                        'aria-labelledby': 'basic-button',
                    }}
                >
                    <MenuItem onClick={handleClose}>
                        <button onClick={sendLogin}>ログインページへ</button>
                    </MenuItem>
                    <MenuItem onClick={handleClose}>
                        {isFullscreen ? (
                            <button onClick={exitFullscreen}>フルスクリーン解除</button>
                        ) : (
                            <button onClick={enterFullscreen}>フルスクリーンにする</button>
                        )}
                    </MenuItem>
                    <MenuItem onClick={handleClose}>
                        <button onClick={lockToLandscape}>横向きにする</button>
                    </MenuItem>
                </Menu>
            </div>
        </header>
    )
}