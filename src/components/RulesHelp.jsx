import { useState } from "react";
import rulesDiagram from "../assets/local-rules.webp?inline";
import Dialog from "./Dialog.jsx";

export default function RulesHelp({ onClose }) {
  const [zoomed, setZoomed] = useState(false);
  return (
    <Dialog title="遊び方" className="rules-dialog" wide onClose={onClose}>
      <p className="dialog-copy">
        1枚ずつ、実物とアプリを同じ位置に追加します。人数・1人の枚数は自由です。
      </p>
      <div className="rules-tools">
        <button
          className="button secondary compact"
          type="button"
          aria-pressed={zoomed}
          aria-controls="rules-diagram"
          onClick={() => setZoomed(!zoomed)}
        >
          {zoomed ? "図を全体表示" : "図を拡大"}
        </button>
      </div>
      <figure
        id="rules-diagram"
        className={`rules-figure ${zoomed ? "is-zoomed" : ""}`}
        tabIndex={zoomed ? 0 : undefined}
        aria-label={
          zoomed ? "拡大した遊び方の図。左右にスクロールできます。" : undefined
        }
      >
        <img
          src={rulesDiagram}
          width="883"
          height="1780"
          alt="1枚ずつ宣言し、実物を裏向きで置き、同じ位置にアプリへ登録する手順。A・B・Cの追加例、実物9枚とアプリ9枚の対応例、全カード配置後に左端の実物カード「7」を公開する確認例。"
        />
      </figure>
      <ol className="help-steps">
        <li>
          <b>01</b>
          <div>
            <strong>1人ずつ、1枚の宣言をする</strong>
            <p>お題に沿った宣言文を伝えます。</p>
          </div>
        </li>
        <li>
          <b>02</b>
          <div>
            <strong>実物とアプリを同じ位置に追加する</strong>
            <p>
              実物カードを裏向きで列の前・間・後へ置き、同じ位置の＋から宣言文を登録します。この手順を1枚ずつ繰り返します。
            </p>
          </div>
        </li>
        <li>
          <b>03</b>
          <div>
            <strong>すべて出したら、めくって順番を確認</strong>
            <p>全カードを出してから手元のカードをめくり、順番を確認します。</p>
          </div>
        </li>
      </ol>
      <h3 className="settings-title">アプリの操作</h3>
      <p className="dialog-copy">
        「カードを追加」は末尾、カードの間の＋はその位置に追加します。修正するときはドラッグや左右ボタンで並べ替えできます。同じ宣言文も複数登録できます。
      </p>
      <div className="info-box">
        アプリに数字や持ち主を登録する必要はありません。数字の公開と順序の確認は実物カードで行います。
      </div>
      <button
        className="button primary full-width"
        type="button"
        onClick={onClose}
      >
        閉じる
      </button>
    </Dialog>
  );
}
