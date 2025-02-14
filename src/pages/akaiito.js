import React from 'react'
import { useRouter } from "next/router";

function Akaiito() {
  const router = useRouter();
  const handleBack = () => {
    router.back();
  }
  return (
    <div>
        <div>すみません! 現在準備中です</div>
        <button onClick={handleBack}>戻る</button>
    </div>
  )
}

export default Akaiito