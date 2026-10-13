const paths = {
  plus: "M12 5v14M5 12h14",
  close: "m6 6 12 12M6 18 18 6",
  arrow: "M5 12h14m-5-5 5 5-5 5",
  left: "m14 6-6 6 6 6",
  right: "m10 6 6 6-6 6",
  save: "M5 4h12l3 3v13H4V4h1m3 0v6h8V4M8 20v-7h8v7",
  history: "M3 11a9 9 0 1 1 2 7M3 4v7h7M12 7v5l3 2",
  board: "M3 5h7v14H3zM14 5h7v14h-7z",
  edit: "m14 5 5 5M4 20l5-1L20 8a2 2 0 0 0-5-5L4 14v6z",
  trash: "M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7",
  check: "m5 12 4 4L19 6",
  download: "M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5",
  upload: "M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5",
  settings: "M4 6h16M4 12h16M4 18h16M8 3v6M16 9v6M10 15v6",
  help: "M9 9a3 3 0 1 1 4 3c-1 .5-1 1-1 2M12 17v.1M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
  undo: "M9 5 3 11l6 6M3 11h11a6 6 0 0 1 6 6",
  reset: "M3 11a9 9 0 1 1 2 7M3 4v7h7",
  grip: "M9 5h.01M15 5h.01M9 12h.01M15 12h.01M9 19h.01M15 19h.01",
  alert: "M12 8v5M12 17v.1M10 3 1 19h22L14 3z",
  expand: "M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5",
  sun: "M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4l1.4-1.4M17 7l1.4-1.4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
};
export default function Icon({ name, size = 20, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={name === "grip" ? 3.6 : 1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d={paths[name] ?? paths.plus} />
    </svg>
  );
}
