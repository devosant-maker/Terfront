import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";

const useDist = process.argv.includes("--dist");
const root = process.cwd();
const serveDir = resolve(root, useDist ? "dist" : "public");
const port = Number(process.env.PORT || 5173);

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const clean = normalize(decoded).replace(/^(\.\.[/\\])+/, "");
  return join(serveDir, clean === "/" ? "index.html" : clean);
}

const server = createServer(async (req, res) => {
  try {
    if (req.url.startsWith("/config.js") && !useDist) {
      const wsUrl = process.env.VITE_TERMINAL_WS_URL || "ws://localhost:3000/terminal";
      res.writeHead(200, { "Content-Type": "text/javascript; charset=utf-8" });
      res.end(`window.APP_CONFIG = ${JSON.stringify({ WS_URL: wsUrl }, null, 2)};\n`);
      return;
    }

    let filePath = safePath(req.url);

    if (!existsSync(filePath)) {
      filePath = join(serveDir, "index.html");
    }

    const data = await readFile(filePath);
    res.writeHead(200, { "Content-Type": types[extname(filePath)] || "application/octet-stream" });
    res.end(data);
  } catch (error) {
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(`Server error: ${error.message}`);
  }
});

server.listen(port, () => {
  console.log(`Frontend dev server running at http://localhost:${port}`);
});
