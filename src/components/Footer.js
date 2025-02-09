import React from 'react';
import styles from '../styles/components_styles/Footer.module.css';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import { IoAdd } from "react-icons/io5";
import { BsQuestionCircle } from "react-icons/bs";

export default function Footer() {
    return(
        <footer className={styles.footer}>
            <button className={styles.add}>
                <IoAdd size={30} style={{ color: "white" }}/>
                <span className={styles.span}>カード追加</span>
            </button>
            <button>
                <BsQuestionCircle size={25} style={{ color: "rgb(255, 149, 0)" }}/>
            </button>
        </footer>
    )
}