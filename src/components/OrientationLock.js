import { useEffect } from "react";
import { useRouter } from "next/router";

export default function OrientationLock() {
  const router = useRouter();

  useEffect(() => {
    const isPortraitPage = router.pathname === "/"; // `/` (index.js) のみ縦向き
    const body = document.body;

    if (isPortraitPage) {
      body.classList.remove("lock-landscape"); // 横向き固定を解除
    } else {
      body.classList.add("lock-landscape"); // 横向き固定を適用
    }

    return () => {
      body.classList.remove("lock-landscape"); // クリーンアップ（遷移時のバグ防止）
    };
  }, [router.pathname]);

  return null;
}
