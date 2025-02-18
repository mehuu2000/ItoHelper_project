'use client'

import Head from "next/head";
import { useRouter } from "next/router"; // useRouter をインポート
import { useState, useEffect } from "react";
import styles from "../styles/Home.module.css"; // CSS を適用したい場合
import { useSession } from "next-auth/react";
import ViewHistory from "../components/ViewHistory";
//MUI
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
// import CheckIcon from '@mui/icons-material/Check';
// import InfoIcon from '@mui/icons-material/Info';
import MenuIcon from '@mui/icons-material/Menu';
import KeyboardReturnIcon from '@mui/icons-material/KeyboardReturn';
//react-hot-toast
import toast, { Toaster } from "react-hot-toast";

export default function History() {
    const router = useRouter();

    const sendLogin = () => {
        router.push("/");
    }

    const { data: session, status } = useSession();
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        if (status === "authenticated") {
            setCurrentUser(session.user); // 認証されていれば、currentUserを設定
        }
    }, [session, status]);

    // useEffect(() => {
    //     console.log(`a: ${currentUser.name}`);
    // }, [currentUser]);

    // もし「戻る」ボタンを押す場合
    const handleBack = () => {
        router.push("/home"); // ホーム画面（/）に戻る
    };

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

    //フルスクリーン設定
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
        // **フルスクリーンにしてから横向きにする**
        //   if (document.documentElement.requestFullscreen) {
        //     await document.documentElement.requestFullscreen();
        //   }
    
        await screen.orientation.lock("landscape");
        // console.log("横向きにしました");
        } catch (error) {
        // console.error("横向きの変更に失敗しました:", error);
        alert("横向きにできませんでした。あなたのデバイス設定で画面ロックを解除し、ご自分で横向きにしてください");
        }
    };
    ////
    
    if (status === "loading") {
        return <p>読み込み中...</p>; // 読み込み中の表示
    };

    return (
        <>
          <Head>
            <title>Ito helper</title>
            <meta name="description" content="Ito Helperのゲーム履歴ページ" />
            <meta name="viewport" content="initial-scale=1.0" />
          </Head>
    
          <main>
            <div className={styles.view}>
                <header className={styles.header}>
                    <button onClick={handleBack}><KeyboardReturnIcon sx={{ color: 'white' }} /></button>
                    <h1 className={styles.h1}>Ito Helper</h1>
                    <div className={styles.menu}>
                        <p className={styles.islogin}>
                            {currentUser == null ? "未ログイン" : "ログイン中"}
                        </p>
                        <Button
                            id="basic-button"
                            aria-controls={open ? 'basic-menu' : undefined}
                            aria-haspopup="true"
                            aria-expanded={open ? 'true' : undefined}
                            onClick={handleClick}
                        >
                            <MenuIcon sx={{ color: 'white' }}/>
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
                <ViewHistory currentUser={currentUser}/>
            </div>
          </main>
        </>
    )
}