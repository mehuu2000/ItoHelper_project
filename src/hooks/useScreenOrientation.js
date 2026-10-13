import { useEffect, useRef, useState } from "react";
import {
  requestLandscape,
  releaseLandscape,
} from "../lib/screen-orientation.js";

export function useScreenOrientation() {
  const [busy, setBusy] = useState(false);
  const [fullscreen, setFullscreen] = useState(
    Boolean(document.fullscreenElement),
  );
  const [locked, setLocked] = useState(false);
  const [message, setMessage] = useState("");
  const alive = useRef(true);
  const operation = useRef(0);
  const working = useRef(false);
  const pending = useRef(null);
  const releasing = useRef(false);
  useEffect(() => {
    alive.current = true;
    const changed = () => {
      const active = Boolean(document.fullscreenElement);
      setFullscreen(active);
      if (!active) {
        setLocked(false);
        if (!working.current) setMessage("");
      }
    };
    document.addEventListener("fullscreenchange", changed);
    return () => {
      alive.current = false;
      operation.current += 1;
      document.removeEventListener("fullscreenchange", changed);
    };
  }, []);
  const enter = async () => {
    if (working.current) return;
    working.current = true;
    const id = ++operation.current;
    setBusy(true);
    setMessage("");
    const task = requestLandscape({
      doc: document,
      screen: window.screen,
      isCurrent: () => alive.current && operation.current === id,
    });
    pending.current = task;
    const result = await task;
    if (pending.current === task) pending.current = null;
    if (!alive.current || operation.current !== id) return;
    working.current = false;
    setBusy(false);
    setFullscreen(Boolean(document.fullscreenElement));
    setLocked(result.ok);
    setMessage(
      result.ok
        ? "横向き表示を設定しました"
        : result.cleanupFailed
          ? "端末を横向きにしてください。全画面を解除するには下の解除ボタンを押してください。"
          : "この環境では自動で横向きにできません。端末を横向きにしてください。",
    );
  };
  const exit = async () => {
    if (releasing.current) return;
    releasing.current = true;
    const id = ++operation.current;
    const earlier = pending.current;
    working.current = true;
    setBusy(true);
    setMessage("");
    const result = await releaseLandscape({
      doc: document,
      screen: window.screen,
    });
    // Do not start a new request while cancellation of the previous one is pending.
    if (earlier) await earlier;
    releasing.current = false;
    if (!alive.current || operation.current !== id) return;
    working.current = false;
    setBusy(false);
    setFullscreen(Boolean(document.fullscreenElement));
    if (result.ok) setLocked(false);
    setMessage(
      result.ok
        ? "横向き・全画面を解除しました"
        : "解除できませんでした。ブラウザの全画面解除を使用してください。",
    );
  };
  return { busy, fullscreen, locked, message, enter, exit };
}
