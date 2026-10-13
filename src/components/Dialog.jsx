import { useLayoutEffect, useRef } from "react";
import Icon from "./Icon.jsx";
export default function Dialog({
  title,
  eyebrow,
  children,
  onClose,
  wide = false,
  className = "",
}) {
  const ref = useRef(null);
  const opener = useRef(document.activeElement);
  useLayoutEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    // A newly fullscreen element enters the top layer; keep existing controls above it.
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
      if (opener.current instanceof HTMLElement && opener.current.isConnected)
        opener.current.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog
      className={`dialog ${wide ? "dialog-wide" : ""} ${className}`}
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) {
          const r = ref.current.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            onClose();
        }
      }}
      aria-label={title}
    >
      <div className="dialog-heading">
        <div>
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h2>{title}</h2>
        </div>
        <button
          className="icon-button"
          onClick={onClose}
          type="button"
          aria-label="閉じる"
        >
          <Icon name="close" />
        </button>
      </div>
      {children}
    </dialog>
  );
}
