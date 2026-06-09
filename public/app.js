const XTERM_URL = "https://cdn.jsdelivr.net/npm/@xterm/xterm@5.5.0/+esm";
const FIT_ADDON_URL = "https://cdn.jsdelivr.net/npm/@xterm/addon-fit@0.10.0/+esm";
const DEFAULT_WS_URL = window.APP_CONFIG?.WS_URL || "ws://localhost:3000/terminal";

const terminalElement = document.querySelector("#terminal");
const fallbackTerminal = document.querySelector("#fallbackTerminal");
const fallbackOutput = document.querySelector("#fallbackOutput");
const fallbackInput = document.querySelector("#fallbackInput");
const wsUrlInput = document.querySelector("#wsUrl");
const tokenInput = document.querySelector("#token");
const connectBtn = document.querySelector("#connectBtn");
const disconnectBtn = document.querySelector("#disconnectBtn");
const clearBtn = document.querySelector("#clearBtn");
const statusBadge = document.querySelector("#status");

let socket = null;
let terminal = null;
let fitAddon = null;
let usingFallback = false;

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

function writeOutput(text) {
  if (usingFallback) {
    fallbackOutput.textContent += text.replace(/\x1b\[[0-9;]*m/g, "");
    fallbackOutput.scrollTop = fallbackOutput.scrollHeight;
    return;
  }

  terminal.write(text);
}

function clearOutput() {
  if (usingFallback) {
    fallbackOutput.textContent = "";
    return;
  }
  terminal.clear();
}

function focusInput() {
  if (usingFallback) fallbackInput.focus();
  else terminal.focus();
}

function fitTerminal() {
  if (usingFallback || !fitAddon) return;

  try {
    fitAddon.fit();
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "resize", cols: terminal.cols, rows: terminal.rows }));
    }
  } catch (_error) {}
}

function connect() {
  const wsUrl = wsUrlInput.value.trim();
  const token = tokenInput.value.trim();

  if (!wsUrl) {
    writeOutput("\r\nURL WebSocket belum diisi.\r\n");
    return;
  }

  if (!token) {
    writeOutput("\r\nToken belum diisi.\r\n");
    return;
  }

  if (socket && socket.readyState === WebSocket.OPEN) {
    writeOutput("\r\nSudah terhubung.\r\n");
    return;
  }

  saveSettings();
  clearOutput();
  writeOutput("Connecting...\r\n");
  setStatus("Connecting", "connecting");

  socket = new WebSocket(buildUrl(wsUrl, token));

  socket.addEventListener("open", () => {
    setStatus("Connected", "connected");
    focusInput();
    fitTerminal();

    if (!usingFallback) {
      socket.send(JSON.stringify({ type: "resize", cols: terminal.cols, rows: terminal.rows }));
    }
  });

  socket.addEventListener("message", (event) => writeOutput(event.data));

  socket.addEventListener("close", () => {
    setStatus("Disconnected", "disconnected");
    writeOutput("\r\n\nConnection closed.\r\n");
  });

  socket.addEventListener("error", () => {
    setStatus("Error", "disconnected");
    writeOutput("\r\n\nConnection error. Cek token, URL backend, dan ALLOWED_ORIGIN.\r\n");
  });
}

function disconnect() {
  if (socket) {
    socket.close();
    socket = null;
  }
  setStatus("Disconnected", "disconnected");
}

async function initXterm() {
  try {
    const [{ Terminal }, { FitAddon }] = await Promise.all([
      import(XTERM_URL),
      import(FIT_ADDON_URL)
    ]);

    terminal = new Terminal({
      cursorBlink: true,
      fontFamily: "SFMono-Regular, ui-monospace, Menlo, Monaco, Consolas, monospace",
      fontSize: 14,
      lineHeight: 1.25,
      theme: {
        background: "#090d18",
        foreground: "#d7e1ff",
        cursor: "#fff7b8",
        selectionBackground: "#334155"
      }
    });

    fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(terminalElement);
    terminal.onData((data) => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "input", data }));
      }
    });

    setTimeout(() => {
      fitTerminal();
      terminal.writeln("iPad Online Terminal siap.");
      terminal.writeln("Isi WebSocket URL dan token, lalu tekan Connect.");
    }, 50);
  } catch (error) {
    usingFallback = true;
    terminalElement.classList.add("hidden");
    fallbackTerminal.classList.remove("hidden");
    fallbackOutput.textContent = "Mode fallback aktif. Library xterm CDN tidak berhasil dimuat.\nTerminal tetap bisa menjalankan command sederhana.\n\n";
  }
}

fallbackInput.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  const command = fallbackInput.value;
  fallbackInput.value = "";
  fallbackOutput.textContent += `$ ${command}\n`;

  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: "input", data: `${command}\n` }));
  } else {
    fallbackOutput.textContent += "Belum terhubung. Klik Connect dulu.\n";
  }
});

connectBtn.addEventListener("click", connect);
disconnectBtn.addEventListener("click", disconnect);
clearBtn.addEventListener("click", clearOutput);
window.addEventListener("resize", fitTerminal);
window.addEventListener("orientationchange", () => setTimeout(fitTerminal, 300));

wsUrlInput.value = localStorage.getItem("terminal_ws_url") || DEFAULT_WS_URL;
tokenInput.value = localStorage.getItem("terminal_token") || "";

initXterm();
