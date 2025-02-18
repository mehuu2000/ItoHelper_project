import React from 'react';

const Popup = ({ open, onClose, children }) => {
    if (!open) return null;
  
    // ポップアップ外をクリックで閉じる
    const handleOutsideClick = (e) => {
      if (e.target.id === 'popup-overlay') {
        onClose();
      }
    };

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
            padding: '10px',
            overflow: 'auto',
          }}
          onClick={handleOutsideClick}
        >
          <div
            style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '8px',
              position: 'relative',
              maxWidth: '70%',
              maxHeight: '80vh', // 画面の80%を超えたらスクロール
              overflowY: 'auto',
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
            <h3>説明</h3>
            <p>{children}</p>
          </div>
        </div>
      );
    };
    
    export default Popup;