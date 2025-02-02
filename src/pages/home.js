'use client'

import Head from "next/head";
import { useRouter } from "next/router"; // useRouter をインポート
import { useState, useEffect } from "react";
import styles from "../styles/Home.module.css"; // CSS を適用したい場合
import { useSession } from "next-auth/react";

export default function Home() {
  const router = useRouter();

  const { data: session, status } = useSession();
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    if (status === "authenticated") {
      setCurrentUser(session.user); // 認証されていれば、currentUserを設定
    }
  }, [session, status]);

  // もし「戻る」ボタンを押す場合
  const handleBack = () => {
    router.push("/"); // ホーム画面（/）に戻る
  };

  if (status === "loading") {
    return <p>読み込み中...</p>; // 読み込み中の表示
  }

  return (
    <>
      <Head>
        <title>ホームページ | Ito helper</title>
        <meta name="description" content="Ito Helper のホームページです。" />
        <meta name="viewport" content="initial-scale=1.0" />
      </Head>

      <main>
        <div className={styles.view}>
            <h1 className={styles.h1}>ホームページ</h1>
            <p className={styles.explain}>Ito Helper へようこそ！</p>
            <p>認証情報</p>
            {session ? (
                <div>
                    <p>{session.user.id}</p>
                    <p>{session.user.name}</p>
                </div>
            ) : (
                <p>sessionがありません。ログインしてください</p>
            )}

            <button className={styles.button} onClick={handleBack}>
            戻る
            </button>
        </div>
      </main>
    </>
  );
}