import React, { useEffect } from 'react';

import styles from '../styles/components_styles/settingPoupu.module.css';

import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import { inputBaseClasses } from '@mui/material/InputBase';


const SettingPopup = ({ open, onClose, isCheck, handleSwitchChange, handleSwitchColor }) => {
    
    if (!open) return null;
  
    // ポップアップ外をクリックで閉じる
    const handleOutsideClick = (e) => {
      if (e.target.id === 'popup-overlay') {
        onClose();
      }
    };

    // const handleChangePlayerCount = (e) => {
    //     setPlayerCount(e.target.value);
    // }


    return (
        <div
          id="popup-overlay"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          onClick={handleOutsideClick}
        >
          <div
            style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '8px',
              position: 'relative',
              maxWidth: '65%',
            }}
          >
            <button
              onClick={onClose}
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
              }}
            >
              ×
            </button>
            <h3>設定</h3>
            <div className={styles.settings}>
                <FormControlLabel
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
                    label="削除・リセット・登録の際に確認をしますか?"
                />
                <p className={styles.p}>フルスクリーン・横画面が解除されることがあります</p>
                {/* <FormControlLabel
                    control={
                        <Switch
                            checked={isColor}
                            onChange={handleSwitchColor}
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
                    label="参加者ごとに色をつける"
                />
                {isColor && (<p className={styles.p}>参加人数も入力してください</p>)} */}

                {/* <TextField
                    id="standard-suffix-shrink"
                    label="人数"
                    variant="standard"
                    value={playerCount}
                    onChange={handleChangePlayerCount}
                    type='number'
                    sx={{
                        '& .MuiInput-underline:before': {
                            borderBottomColor: 'rgba(255, 149, 0, 0.5)', // 通常時のボーダー
                        },
                        '& .MuiInput-underline:after': {
                            borderBottomColor: 'rgb(255, 149, 0)', // フォーカス時のボーダー
                        },
                        '& .MuiInputLabel-root': {
                            color: 'rgba(0, 0, 0, 0.6)', // 通常時のラベルの色
                        },
                        '& .MuiInputLabel-root.Mui-focused': {
                            color: 'rgb(255, 149, 0)', // フォーカス時のラベルの色
                        },
                        '& input': {
                            '&:focus': {
                                caretColor: 'rgb(255, 149, 0)', // フォーカス時のカーソルの色
                            },
                        }
                    }}
                    slotProps={{
                        htmlInput: {
                            sx: { textAlign: 'right', marginRight: '5px' },
                            inputMode: "numeric",
                        },
                        input: {
                        endAdornment: (
                            <InputAdornment
                            position="end"
                            sx={{
                                alignSelf: 'flex-end',
                                margin: 0,
                                marginBottom: '5px',
                                opacity: 0,
                                pointerEvents: 'none',
                                [`[data-shrink=true] ~ .${inputBaseClasses.root} > &`]: {
                                opacity: 1,
                                },
                            }}
                            >
                            人
                            </InputAdornment>
                        ),
                        },
                    }}
                />
                <p className={styles.p}>半角数字を入力してください</p> */}
            </div>
          </div>
        </div>
      );
    };
    
    export default SettingPopup;