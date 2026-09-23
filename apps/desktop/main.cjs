const { app, BrowserWindow, shell, session } = require("electron");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { randomBytes } = require("node:crypto");
let bridge;
function createWindow(token) {
  const win = new BrowserWindow({
    width: 1440,
    height: 940,
    minWidth: 900,
    minHeight: 640,
    backgroundColor: "#f8f6f1",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
  });
  const development = !app.isPackaged;
  const policy = development
    ? "default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' http://127.0.0.1:3210 ws://127.0.0.1:5173; font-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"
    : "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' http://127.0.0.1:3210; font-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'";
  session.defaultSession.webRequest.onHeadersReceived((details, callback) =>
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [policy],
      },
    }),
  );
  win.webContents.on("will-navigate", (event, url) => {
    const allowed = development
      ? url.startsWith("http://127.0.0.1:5173")
      : url.startsWith("file://");
    if (!allowed) event.preventDefault();
  });
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://ollama.com/")) shell.openExternal(url);
    return { action: "deny" };
  });
  if (development) win.loadURL("http://127.0.0.1:5173");
  else win.loadFile(path.join(__dirname, "../../dist/web/index.html"));
}
app.whenReady().then(() => {
  const token = randomBytes(32).toString("hex");
  process.env.KONGO_API_TOKEN = token;
  if (app.isPackaged || process.env.KONGO_EXTERNAL_BRIDGE !== "1")
    bridge = spawn(
      process.execPath,
      [
        "--env-file-if-exists=.env",
        path.join(__dirname, "../server/index.mjs"),
      ],
      {
        stdio: "inherit",
        env: {
          ...process.env,
          KONGO_API_TOKEN: token,
          ELECTRON_RUN_AS_NODE: "1",
        },
      },
    );
  createWindow(token);
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow(token);
  });
});
app.on("before-quit", () => bridge?.kill());
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
