import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import "./style.css";

const DEFAULT_WS_URL = import.meta.env.VITE_TERMINAL_WS_URL || "ws://localhost:3000/terminal";

const terminalElement = document.querySelector("#terminal");
const wsUrlInput = document.querySelector("#wsUrl");
const tokenInput = document.querySelector("#token");
const connectBtn = document.querySelector("#connectBtn");
const disconnectBtn = document.querySelector("#disconnectBtn");
const clearBtn = document.querySelector("#clearBtn");
const statusBadge = document.querySelector("#status");

let socket = null;

const terminal = new Terminal({
  cursorBlink: true,
  fontFamily: "SFMono-Regular, ui-monospace, Menlo, Monaco, Consolas, monospace",
  fontSize: 14,
  lineHeight: 1.25,
  theme: {
    background: "#090d18",
    foreground: "#d7e1ff",
    cursor: "#fff7b8",
    selectionBackground: "#334155"
  },
  allowProposedApi: true
});

const fitAddon = new FitAddon();
terminal.loadAddon(fitAddon);
terminal.open(terminalElement);

function fitTerminal() {
  try {
    fitAddon.fit();

    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: "resize",
        cols: terminal.cols,
        rows: terminal.rows
      }));
    }
  } catch (_error) {
    // Terminal may not be visible yet.
  }
}

function setStatus(text, state) {
  statusBadge.textContent = text;
  statusBadge.className = `status ${state}`;
}

function buildUrl(baseUrl, token) {
  const url = new URL(baseUrl);
  url.searchParams.set("token", token);
  return url.toString();
}

function saveSettings() {
  localStorage.setItem("terminal_ws_url", wsUrlInput.value.trim());
  localStorage.setItem("terminal_token", tokenInput.value.trim());
}

function connect() {
  const wsUrl = wsUrlInput.value.trim();
  const token = tokenInput.value.trim();

  if (!wsUrl) {
    terminal.writeln("\r\nURL WebSocket belum diisi.");
    return;
  }

  if (!token) {
    terminal.writeln("\r\nToken belum diisi.");
    return;
  }

  if (socket && socket.readyState === WebSocket.OPEN) {
    terminal.writeln("\r\nSudah terhubung.");
    return;
  }

  saveSettings();
  terminal.clear();
  terminal.writeln("Connecting...");

  socket = new WebSocket(buildUrl(wsUrl, token));
  setStatus("Connecting", "connecting");

  socket.addEventListener("open", () => {
    setStatus("Connected", "connected");
    terminal.focus();
    fitTerminal();

    socket.send(JSON.stringify({
      type: "resize",
      cols: terminal.cols,
      rows: terminal.rows
    }));
  });

  socket.addEventListener("message", (event) => {
    terminal.write(event.data);
  });

  socket.addEventListener("close", () => {
    setStatus("Disconnected", "disconnected");
    terminal.writeln("\r\n\nConnection closed.");
  });

  socket.addEventListener("error", () => {
    setStatus("Error", "disconnected");
    terminal.writeln("\r\n\nConnection error. Cek token, URL backend, dan ALLOWED_ORIGIN.");
  });
}

function disconnect() {
  if (socket) {
    socket.close();
    socket = null;
  }
  setStatus("Disconnected", "disconnected");
}

terminal.onData((data) => {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({
      type: "input",
      data
    }));
  }
});

connectBtn.addEventListener("click", connect);
disconnectBtn.addEventListener("click", disconnect);
clearBtn.addEventListener("click", () => terminal.clear());

window.addEventListener("resize", fitTerminal);
window.addEventListener("orientationchange", () => {
  setTimeout(fitTerminal, 300);
});

wsUrlInput.value = localStorage.getItem("terminal_ws_url") || DEFAULT_WS_URL;
tokenInput.value = localStorage.getItem("terminal_token") || "";

setTimeout(() => {
  fitTerminal();
  terminal.writeln("iPad Online Terminal siap.");
  terminal.writeln("Isi WebSocket URL dan token, lalu tekan Connect.");
}, 50);
