const { spawn } = require("node:child_process");
const { existsSync } = require("node:fs");
const http = require("node:http");

const host = "localhost";
const port = 1420;
const url = `http://${host}:${port}`;
const chromePaths = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
];

const viteCommand = `corepack${process.platform === "win32" ? ".cmd" : ""} pnpm exec vite --host ${host} --port ${port}`;
const vite = process.platform === "win32"
  ? spawn("cmd.exe", ["/d", "/s", "/c", viteCommand], { stdio: "inherit", shell: false })
  : spawn("sh", ["-lc", viteCommand], { stdio: "inherit", shell: false });

let opened = false;
const timer = setInterval(() => {
  if (opened) {
    return;
  }

  const request = http.get(url, (response) => {
    response.resume();
    opened = true;
    clearInterval(timer);

    const chrome = chromePaths.find((path) => existsSync(path));
    spawn(chrome || url, chrome ? [url] : [], {
      detached: true,
      stdio: "ignore",
      shell: !chrome,
    }).unref();
  });

  request.on("error", () => {});
  request.setTimeout(1000, () => request.destroy());
}, 500);

vite.on("exit", (code, signal) => {
  clearInterval(timer);
  if (signal) {
    process.kill(process.pid, signal);
  }
  process.exit(code ?? 0);
});
