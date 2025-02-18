import React, { useState } from 'react';
import styles from '../styles/components_styles/Footer.module.css';
import { IoAdd } from "react-icons/io5";
import { MdDeleteOutline } from "react-icons/md";
import { MdOutlineDeleteSweep } from "react-icons/md";
import { BsQuestionCircle } from "react-icons/bs";
import { TbCancel } from "react-icons/tb";
import { RiResetLeftFill } from "react-icons/ri";
import { ImSwitch } from "react-icons/im";
import Popup from '../components/Popup';

// import FormControlLabel from '@mui/material/FormControlLabel';
// import Switch from '@mui/material/Switch';
import InfoIcon from '@mui/icons-material/Info';

import toast, { Toaster } from "react-hot-toast";
// import { ToastContainer, toast } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";


export default function Footer({ isDelete, setIsDelete, handleDelete, handleDeleteCansel, handleClear, fin, currentUser, isInsert, setIsInsert, handleInsertCard, handleInsertCansel, isInserting, isCheck }) {
    //確認するかどうか
    // const [isCheck, setIsCheck] = useState(true);
    // const handleSwitchChange = (event) => {
    //     setIsCheck(event.target.checked);
    // };
    ////////////
    const [showPopup, setShowPopup] = useState(false);
    const [popupContent, setPopupContent] = useState(
        <>
            <div className={styles.popup}>
                <br />
                <h2>-カード作成-</h2>
                <p>カード作成ボタンを押し、追加する場所の左右カードを2枚選択してください</p>
                <p>端に置きたい場合はカード列の端のカードを1枚選択してください</p>
                <p>初めての作成の場合は、何も選択せずにカード追加ボタンを押してください</p>
                <p>選択できたらカード追加ボタンを押し、値を入力し完了を押してください</p>
                <br />
                <h2>-削除、リセット-</h2>
                <p>直感でわかると思います</p>
                <br />
                <h2>-終了-</h2>
                <p>ゲームの記録を保存します。 カードたちはリセットされません</p>
                <br />
                <h2 style={{color: 'red'}}>-カードの並べ替えについて-</h2>
                <p style={{color: 'red'}}>カードを長押してからドラッグ&ドロップで並べ替えることができます</p>
                <p style={{color: 'red'}}>その際に初め横にスライドせずに一度、上もしくは下にずらしてからドラッグしてください</p>
            </div>
        </>
    );

    const handleClickInsert = () => {
        if(isInsert) {
            // console.log("挿入します");
            handleInsertCard();
        } else {
            if(isDelete) {
                handleDeleteCansel();
            }
            // console.log("挿入場所を選択します");
            toast(
                <>
                    選択してください
                </>, 
                {
                    icon: <InfoIcon sx={{ color: 'green' }}/>,
                    duration: 2000, // 5000ミリ秒（5秒）表示
                }
            );
        }
        setIsInsert(!isInsert);
    }

    const handleClickDelete = () => {
        if(isDelete) {
            if(isCheck) {
                const isConfirmed = window.confirm("本当に削除してもよろしいですか？");
    
                if (isConfirmed) {
                    // console.log("削除します");
                    handleDelete();
                } else {
                    handleDeleteCansel();
                    // console.log("キャンセルされました");
                }
            } else {
                handleDelete();
            }
        } else {
            if(isInsert) {
                handleInsertCansel();
            }
            // console.log("削除対処を選びます");
            toast(
                <>
                    選択してください
                </>, 
                {
                    icon: <InfoIcon sx={{ color: 'green' }}/>,
                    duration: 2000, // 5000ミリ秒（5秒）表示
                }
            );
        }
        setIsDelete(!isDelete);
    }

    const handleClickClear = () => {
        if(isCheck) {
            const isConfirmed = window.confirm("本当にクリアしてもよろしいですか？");

            if (isConfirmed) {
                handleClear();
            } else {
                // console.log("キャンセルされました");
            }
        } else {
            handleClear();
        }
    }

    const handleClickFin = () => {
        if(isCheck) {
            const isConfirmed = window.confirm("ゲームは終了しましたか？また、このゲームを記録しますか？");

            if (isConfirmed) {
                fin();
            } else {
                // console.log("キャンセルされました");
            }
        } else {
            fin()
        }
        
    }

    //ポップアップ
    const handelOpenExplain = () => {
        setShowPopup(true);
    }
    const handlePopClose = () => {
        setShowPopup(false);
      };
    return(
        <>
            <Toaster
                position="top-left"
                reverseOrder={true}
            />
            <footer className={styles.footer}>
                <div className={styles.insert}>
                    <button className={`${styles.add} ${isInsert ? styles.true : ''}`} onClick={handleClickInsert} disabled={isInserting}>
                        {/* {isInsert ? (
                            <IoAdd 
                                size={30} 
                                style={{ 
                                    color: isInsert ? "white" : "rgb(255, 149, 0)" 
                                 }}
                            />
                        ) : (
                            <IoAdd 
                                size={30} 
                                style={{ 
                                    color: isInsert ? "white" : "rgb(255, 149, 0)" 
                                }}
                            />
                        )} */}
                        <IoAdd 
                            size={30} 
                            style={{ 
                                color: isInsert ? "white" : "rgb(255, 149, 0)" 
                                }}
                        />
                        
                        {isInsert ? (
                            <span className={styles.span}>カード追加</span>
                        ) : (
                            <span className={styles.span}>カード作成</span>
                        )}
                    </button>
                    {isInsert ? (
                        <button className={styles.cancelButton} onClick={handleInsertCansel}>
                            <div className={styles.cancel}>
                                <TbCancel 
                                    size={24} 
                                    style={{ 
                                        color: "rgb(255, 149, 0)" 
                                    }} 
                                />
                                <span className={styles.cancelSpan}>キャンセル</span>
                            </div>
                        </button>
                    ) : null}
                </div>
                <div className={styles.deletes}>
                    <button onClick={handleClickDelete} className={`${styles.delete} ${isDelete ? styles.true : ''}`}>
                        {isDelete ? (
                            <MdDeleteOutline
                                size={30} 
                                style={{ 
                                    color: isDelete ? "white" : "rgb(255, 149, 0)" 
                                }} 
                            />
                        ) : (
                            <MdOutlineDeleteSweep
                                size={30} 
                                style={{ 
                                    color: isDelete ? "white" : "rgb(255, 149, 0)" 
                                }} 
                            />
                        )}
                        {isDelete ? (
                            <span className={styles.span}>カード削除</span>
                        ) : (
                            <span className={styles.span}>カード選択</span>
                        )}
                    </button>
                    {isDelete ? (
                        <button className={styles.cancelButton} onClick={handleDeleteCansel}>
                            <div className={styles.cancel}>
                                <TbCancel 
                                    size={24} 
                                    style={{ 
                                        color: "rgb(255, 149, 0)" 
                                    }} 
                                />
                                <span className={styles.cancelSpan}>キャンセル</span>
                            </div>
                        </button>
                    ) : null}
                </div>
                <button className={styles.delete} onClick={handleClickClear}>
                    <RiResetLeftFill size={25} style={{ color: "rgb(255, 149, 0)" }}/>
                    <span className={styles.span}>リセット</span>
                </button>
                {/* ここでcurrentUserがないと薄く、そしてボタンとして反応しないようにする */}
                <button 
                    className={`${styles.delete} ${!currentUser ? styles.disabled : ""}`} 
                    onClick={currentUser ? handleClickFin : undefined}
                    disabled={!currentUser}
                >
                    <ImSwitch size={25} style={{ color: "rgb(255, 149, 0)" }}/>
                    <span className={styles.span}>終了</span>
                </button>
                {/* <FormControlLabel
                    control={
                        <Switch
                            checked={isCheck}
                            onChange={handleSwitchChange}
                            sx={{
                                '& .MuiSwitch-switchBase.Mui-checked': {
                                    color: 'rgb(255, 149, 0)',  // チェック部分のカラー
                                },
                                '& .MuiSwitch-track': {
                                    backgroundColor: isCheck ? 'rgb(255, 149, 0) !important' : 'rgba(255, 149, 0, 0.3) !important',  // トラック部分のカラー
                                },
                                '& .MuiSwitch-rail': {
                                    backgroundColor: 'rgba(255, 149, 0, 0.3) !important', // レール部分のカラー
                                },
                            }}
                        />
                    }
                    label="確認"
                /> */}
                <button onClick={handelOpenExplain}>
                    <BsQuestionCircle size={25} style={{ color: "rgb(255, 149, 0)" }}/>
                </button>
                <Popup open={showPopup} onClose={handlePopClose}>
                    {popupContent} {/* 渡された内容に基づいて説明文を表示 */}
                </Popup>
            </footer>
        </>
    )
}