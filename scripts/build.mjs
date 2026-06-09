import { cp, mkdir, writeFile } from "node:fs/promises";
import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const publicDir = resolve(root, "public");
const distDir = resolve(root, "dist");

if (existsSync(distDir)) {
  rmSync(distDir, { recursive: true, force: true });
}

await mkdir(distDir, { recursive: true });
await cp(publicDir, distDir, { recursive: true });

const wsUrl = process.env.VITE_TERMINAL_WS_URL || "";
const config = `window.APP_CONFIG = ${JSON.stringify({ WS_URL: wsUrl }, null, 2)};\n`;
await writeFile(resolve(distDir, "config.js"), config, "utf8");

console.log("Static frontend built successfully to dist/.");
