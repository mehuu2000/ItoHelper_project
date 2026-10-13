import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve("dist");
let html = await readFile(path.join(root, "index.html"), "utf8");
const scripts = [
  ...html.matchAll(/<script\b[^>]*src="([^"]+)"[^>]*><\/script>/g),
];
for (const match of scripts) {
  const source = await readFile(
    path.join(root, match[1].replace(/^\.\//, "")),
    "utf8",
  );
  html = html.replace(
    match[0],
    () =>
      `<script type="module">${source.replace(/<\/script/gi, "<\\/script")}</script>`,
  );
}
const styles = [
  ...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g),
];
for (const match of styles) {
  const source = await readFile(
    path.join(root, match[1].replace(/^\.\//, "")),
    "utf8",
  );
  html = html.replace(match[0], () => `<style>${source}</style>`);
}
if (/<script\b[^>]*src=|<link\b[^>]*rel="stylesheet"/.test(html))
  throw new Error("Portable preview still contains external build assets.");
await writeFile(path.join(root, "preview.html"), html);
console.log(
  "Created self-contained dist/preview.html for local visual review. Use static hosting for normal use.",
);
