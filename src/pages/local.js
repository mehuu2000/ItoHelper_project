import React from 'react';
import Header from '../components/Header';
import TypeLocal from '../components/Local/TypeLocal';
import Footer from '../components/Footer';
import styles from '../styles/local.module.css';

export default function Local() {
  return (
    <div className={styles.view}>
      <Header gameName="ローカル"/>
      <TypeLocal />
      <Footer />
    </div>
  )
}