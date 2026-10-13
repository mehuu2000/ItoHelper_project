import { useEffect, useLayoutEffect, useRef, useState } from "react";
import OrientationControls from "./OrientationControls.jsx";

// Restrict the prompt to narrow portrait touch viewports, not desktop windows
// or tablet-sized portrait layouts. The prompt itself does not request a lock.
const PHONE_PORTRAIT =
  "(max-width: 599px) and (orientation: portrait) and (pointer: coarse)";

function RotateNotice({ orientation }) {
  const dialogRef = useRef(null);
  const headingRef = useRef(null);
  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    const opener = document.activeElement;
    dialog.showModal();
    headingRef.current.focus();
    const raise = () => {
      if (!dialog.open) return;
      const focused = document.activeElement;
      dialog.close();
      dialog.showModal();
      if (dialog.contains(focused)) focused.focus({ preventScroll: true });
    };
    document.addEventListener("fullscreenchange", raise);
    return () => {
      document.removeEventListener("fullscreenchange", raise);
      if (dialog.open) dialog.close();
      if (opener instanceof HTMLElement && opener.isConnected)
        opener.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog
      ref={dialogRef}
      className="orientation-notice"
      aria-labelledby="orientation-heading"
      onCancel={(event) => event.preventDefault()}
    >
      <svg
        viewBox="0 0 64 64"
        width="64"
        height="64"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="11" y="20" width="42" height="26" rx="4" />
        <path d="M46 30v6M20 12a22 22 0 0 1 32 4M52 8v8h-8" />
      </svg>
      <h2 id="orientation-heading" ref={headingRef} tabIndex={-1}>
        端末を横向きにしてください
      </h2>
      <OrientationControls orientation={orientation} />
    </dialog>
  );
}

export default function OrientationNotice({ orientation }) {
  const [portrait, setPortrait] = useState(
    () => window.matchMedia?.(PHONE_PORTRAIT).matches ?? false,
  );
  useEffect(() => {
    const media = window.matchMedia?.(PHONE_PORTRAIT);
    if (!media) return;
    const update = () => setPortrait(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return portrait ? <RotateNotice orientation={orientation} /> : null;
}
