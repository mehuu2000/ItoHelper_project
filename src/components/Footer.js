import React, { useState } from 'react';
import styles from '../styles/components_styles/Footer.module.css';
import { IoAdd } from "react-icons/io5";
import { MdDeleteOutline } from "react-icons/md";
import { MdOutlineDeleteSweep } from "react-icons/md";
import { BsQuestionCircle } from "react-icons/bs";
import { TbCancel } from "react-icons/tb";
import InfoIcon from '@mui/icons-material/Info';

import toast, { Toaster } from "react-hot-toast";

export default function Footer({ isDelete, setIsDelete, handleDelete, handleDeleteCansel }) {
    const handleClickDelete = () => {
        if(isDelete) {
            console.log("削除します");
            handleDelete();
        } else {
            console.log("削除対処を選びます");
            toast(
                <>
                    削除するカードを選択してください
                </>, 
                {
                    icon: <InfoIcon sx={{ color: 'green' }}/>,
                    duration: 5000 // 5000ミリ秒（5秒）表示
                }
            );
        }
        setIsDelete(!isDelete);
    }
    return(
        <>
            <Toaster
                position="top-center"
                reverseOrder={true}
            />
            <footer className={styles.footer}>
                <button className={styles.add}>
                    <IoAdd size={30} style={{ color: "white" }}/>
                    <span className={styles.span}>カード追加</span>
                </button>
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
                                <span class="text-[8px]">キャンセル</span>
                            </div>
                        </button>
                    ) : null}
                </div>
                <button>
                    <BsQuestionCircle size={25} style={{ color: "rgb(255, 149, 0)" }}/>
                </button>
            </footer>
        </>
    )
}