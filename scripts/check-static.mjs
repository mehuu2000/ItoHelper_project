import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve("dist");
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(
      new URL(request.url, "http://localhost").pathname,
    );
    const target = path.resolve(
      root,
      `.${pathname === "/" ? "/index.html" : pathname}`,
    );
    if (!target.startsWith(`${root}${path.sep}`))
      throw new Error("Invalid path");
    const content = await readFile(target);
    const types = {
      ".html": "text/html; charset=utf-8",
      ".js": "text/javascript; charset=utf-8",
      ".css": "text/css; charset=utf-8",
    };
    response.writeHead(200, {
      "content-type": types[path.extname(target)] ?? "application/octet-stream",
    });
    response.end(content);
  } catch {
    response.writeHead(404);
    response.end("Not found");
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${server.address().port}`;
try {
  const response = await fetch(base);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<html lang="ja">/);
  const assets = [...html.matchAll(/(?:src|href)="(\.\/assets\/[^"]+)"/g)].map(
    (match) => match[1],
  );
  assert.equal(assets.length, 2);
  for (const asset of assets) {
    const resource = await fetch(new URL(asset, `${base}/`));
    assert.equal(resource.status, 200);
    assert.ok((await resource.text()).length > 0);
  }
  const portable = await (await fetch(`${base}/preview.html`)).text();
  assert.match(portable, /<title>Ito Helper<\/title>/);
  assert.match(portable, /端末を横向きにしてください/);
  assert.match(portable, /data:image\/webp;base64,/);
  assert.doesNotMatch(
    portable,
    /ことばを、並べよう。|YOUR COLLECTION|KEEP YOUR WORDS/,
  );
  assert.doesNotMatch(
    portable,
    /<script\b[^>]*src=|<link\b[^>]*rel="stylesheet"/,
  );
  for (const endpoint of [
    "/api/getHistorys",
    "/api/makeGame",
    "/api/auth/session",
  ]) {
    assert.equal((await fetch(`${base}${endpoint}`)).status, 404);
  }
  console.log(
    "Static HTTP check passed: HTML/JS/CSS, portable preview, and absent legacy APIs.",
  );
} finally {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
}
