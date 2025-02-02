'use client';

import Head from "next/head";
import { useRouter } from "next/router";
import { useState } from "react";
import styles from "../styles/Login.module.css";
import Image from "next/image";
import { signIn } from 'next-auth/react';

import TextField from '@mui/material/TextField';
import CloseIcon from '@mui/icons-material/Close';


export default function Certification() {
  const router = useRouter();
  const [isPassword, setIsPassword] = useState(false);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [LS_Choose, setLS_Choose] = useState("login");

  //サインアップ関数
  const signUpUser = async (name, password) => {
    console.log("signUpUser関数が呼び出されました");
    if(!isPassword) {
      password = "";
    }
    try {
      const response = await fetch('/api/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, password }),
      });
      
      const data = await response.json();
      if (response.ok) {
        return data;  // 成功した場合のデータ
      } else {
        return { error: data.error };  // エラー時のレスポンス
      }
    } catch (error) {
      console.error('サインアップエラー2: ', error);
      return { error: 'サーバーエラー' };  // サーバーエラー
    }
  };

  //認証開始
  const sendFormData = async (event) => {
    event.preventDefault(); 
    console.log("sedFormData関数が呼び出されました");
    console.log(`name:${name}`);
    {isPassword ? (console.log(`password:${password}`)) : null};
    console.log(`状態:${LS_Choose}`);
    if(name) {
      if(LS_Choose == 'login') {
        console.log("ログイン処理開始");
        //ログイン処理
        const responce = await signIn('credentials', {
          redirect: false,
          username: name,
          password: isPassword ? password : "",
        });
    
        if (responce?.error) {
          console.log("ログインエラー: ", responce.error);
        } else {
          console.log("ログイン成功: ", responce);
          router.push('/home');  //要変更
        }
      } else if(LS_Choose == 'signup') {
        console.log("サインアップ処理開始");
        //サインアップ処理
        const res = await signUpUser(name, password);

        if (res?.error) {
          console.log("サインアップエラー1: ", res.error);
        } else {
          console.log("サインアップ成功: ", res);
          
          console.log("ログイン処理を開始します");
          const loginRes = await signIn('credentials', {
            redirect: false,
            username: name,
            password: isPassword ? password : "",
          });

          if (loginRes?.error) {
            console.log("ログインエラー: ", loginRes.error);
          } else {
            console.log("ログイン成功: ", loginRes);
            router.push('/home');
          }
        }
      }
    } else {
      console.log("名前を設定してください");
    }
  };

  const handleChangeName = (e) => {
    setName(e.target.value);
  }

  const handleChangePassword = (e) => {
    setPassword(e.target.value);
  }

  const yesPassword = () => {
    setIsPassword(true);
  }
  const noPassword = () => {
    setIsPassword(false);
  }

  const changeSignup = () => {
    setLS_Choose("signup");
  }
  const changeLogin = () => {
    setLS_Choose("login");
  }

  return (
    <>
      <Head>
        <title>Ito helper</title>
        <meta name="description" content="ボードゲームItoの補助アプリです。Itoをしているときに出したカードが何か覚えられない時はありますよね？
                                          その時にこのIto helperです。カードごとに何を宣言したのか視覚化させ、何がどの順番に出されたか記憶しなくても良くなります。
                                          え？'そんなにカード使わない?''そんなルール聞いたことない?'そんなことは知りません。私(開発者)はローカルルールでお友達と
                                          楽しく遊ぶためだけに開発したのです。他の機能が欲しければ問い合わせてください!"/>
        <meta name="viewport" content="initial-scale=1.0" />
      </Head>
      <main>
        <div className={styles.view}>
          <div className={styles.img}>
            <Image className={styles.logo} 
              src="/ItoHelper_Logo.png" 
              alt="ロゴ" 
              width={200} 
              height={150}
            />
          </div>
          {LS_Choose === "login" ? (
            <div className={styles.content}>
              <h1 className={styles.h1}>Login</h1>
              <p className={styles.explain1}>ログインするとゲームのプレイ履歴などを残せます</p>
              <p className={styles.explain2}>ログインせずに利用することもできます</p>
              {/* <p className={styles.explain2}>パスワードの設定は任意です</p> */}
              <form className={styles.formConteiner} onSubmit={sendFormData}>
                <TextField 
                  id="outlined-basic" 
                  label="name" 
                  variant="outlined" 
                  value={name}
                  type="text"
                  onChange={handleChangeName}
                  sx={{
                    width: '70%',  // コンテナの幅を70%に設定
                    '& .MuiOutlinedInput-root': {
                      '&.Mui-focused': {
                        '& fieldset': {
                          borderColor: 'rgb(255, 149, 0)', // フォーカス時の枠の色を変更
                        },
                      },
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderRadius: '10px',
                      },
                    },
                    '& .MuiInputLabel-root': {
                      '&.Mui-focused': {
                        color: 'rgb(255, 149, 0)', // フォーカス時のラベルの色を変更
                      },
                    },
                    '& input': {
                      '&:focus': {
                        caretColor: 'rgb(255, 149, 0)', // フォーカス時のカーソル（インサートカーソル）の色
                      },
                    }
                  }}
                />
                {isPassword ? (
                  <div className={styles.truePassword}>
                    <button 
                      className={styles.nopsButton} 
                      onClick={noPassword}
                      ><CloseIcon 
                          sx={{
                            padding: '0',
                            margin: '0',
                          }}
                        />
                    </button>
                    <TextField 
                      id="outlined-basic" 
                      label="password" 
                      variant="outlined" 
                      value={password}
                      type="password"
                      onChange={handleChangePassword}
                      sx={{
                        width: '100%',
                        marginTop: '0px',
                        '& .MuiOutlinedInput-root': {
                          '&.Mui-focused': {
                            '& fieldset': {
                              borderColor: 'rgb(255, 149, 0)', // フォーカス時の枠の色を変更
                            },
                          },
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderRadius: '10px 0 10px 10px',
                          },
                        },
                        '& .MuiInputLabel-root': {
                          '&.Mui-focused': {
                            color: 'rgb(255, 149, 0)', // フォーカス時のラベルの色を変更
                          },
                        },
                        '& input': {
                          '&:focus': {
                            caretColor: 'rgb(255, 149, 0)', // フォーカス時のカーソル（インサートカーソル）の色
                          },
                        }
                      }}
                    />
                  </div>
                ) : (
                  <button className={styles.yespsButton} onClick={yesPassword}>
                    パスワードを設定する
                  </button>
                )}
                <div className={styles.dicision}>
                  <button className={styles.signup} type="submit">
                    Login
                  </button>
                  <a href="/home" className={styles.skip}>
                    Skip
                  </a>
                  </div>
                  <button className={styles.toLogin} onClick={changeSignup}>
                    アカウントを登録していませんか？
                    <span className="text-blue-400">
                      ログイン
                    </span>
                  </button>
                <div />
              </form>
            </div>
          ) : LS_Choose === "signup" ? (
            <div className={styles.content}>
              <h1 className={styles.h1}>Signup</h1>
              <p className={styles.explain1}>ログインするとゲームのプレイ履歴などを残せます</p>
              <p className={styles.explain1}>ログインせずに利用することもできます</p>
              <p className={styles.explain2}>パスワードの設定は任意です</p>
              <form className={styles.formConteiner} onSubmit={sendFormData}>
                <TextField 
                  id="outlined-basic" 
                  label="name" 
                  variant="outlined" 
                  value={name}
                  type="text"
                  onChange={handleChangeName}
                  sx={{
                    width: '70%',  // コンテナの幅を70%に設定
                    '& .MuiOutlinedInput-root': {
                      '&.Mui-focused': {
                        '& fieldset': {
                          borderColor: 'rgb(255, 149, 0)', // フォーカス時の枠の色を変更
                        },
                      },
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderRadius: '10px',
                      },
                    },
                    '& .MuiInputLabel-root': {
                      '&.Mui-focused': {
                        color: 'rgb(255, 149, 0)', // フォーカス時のラベルの色を変更
                      },
                    },
                    '& input': {
                      '&:focus': {
                        caretColor: 'rgb(255, 149, 0)', // フォーカス時のカーソル（インサートカーソル）の色
                      },
                    }
                  }}
                />
                {isPassword ? (
                  <div className={styles.truePassword}>
                    <button 
                      className={styles.nopsButton} 
                      onClick={noPassword}
                      ><CloseIcon 
                          sx={{
                            padding: '0',
                            margin: '0',
                          }}
                        />
                    </button>
                    <TextField 
                      id="outlined-basic" 
                      label="password" 
                      variant="outlined" 
                      value={password}
                      type="password"
                      onChange={handleChangePassword}
                      sx={{
                        width: '100%',
                        marginTop: '0px',
                        '& .MuiOutlinedInput-root': {
                          '&.Mui-focused': {
                            '& fieldset': {
                              borderColor: 'rgb(255, 149, 0)', // フォーカス時の枠の色を変更
                            },
                          },
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderRadius: '10px 0 10px 10px',
                          },
                        },
                        '& .MuiInputLabel-root': {
                          '&.Mui-focused': {
                            color: 'rgb(255, 149, 0)', // フォーカス時のラベルの色を変更
                          },
                        },
                        '& input': {
                          '&:focus': {
                            caretColor: 'rgb(255, 149, 0)', // フォーカス時のカーソル（インサートカーソル）の色
                          },
                        }
                      }}
                    />
                  </div>
                ) : (
                  <button className={styles.yespsButton} onClick={yesPassword}>
                    パスワードを設定する
                  </button>
                )}
                <div className={styles.dicision}>
                  <button className={styles.signup} type="submit">
                    Signup
                  </button>
                  <a href="/home" className={styles.skip}>
                    Skip
                  </a>
                  </div>
                  <button className={styles.toLogin} onClick={changeLogin}>
                    アカウントお持ちですか？
                    <span className="text-blue-400">
                      ログイン
                    </span>
                  </button>
                <div />
              </form>
            </div>
            
          ) : null}
        </div>
      </main>
    </>
  );
}