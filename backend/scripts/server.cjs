const { spawn, spawnSync } = require("node:child_process");
const { existsSync } = require("node:fs");
const path = require("node:path");

const command = process.argv[2] || "status";
const port = "3333";
const rootDir = path.resolve(__dirname, "..", "..");
const backendDir = path.resolve(__dirname, "..");
const venvPython = process.platform === "win32"
  ? path.join(backendDir, ".venv", "Scripts", "python.exe")
  : path.join(backendDir, ".venv", "bin", "python");
const python = existsSync(venvPython) ? venvPython : "python";

function runPowerShell(script) {
  return spawnSync("powershell.exe", ["-NoProfile", "-Command", script], {
    cwd: rootDir,
    encoding: "utf8",
  });
}

function portPids() {
  if (process.platform !== "win32") {
    const result = spawnSync("sh", ["-lc", `lsof -ti tcp:${port}`], { encoding: "utf8" });
    return [...new Set(result.stdout.split(/\s+/).filter(Boolean))];
  }

  const script = `
    $ids = @()
    $ids += Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue |
      Select-Object -ExpandProperty OwningProcess
    $ids += netstat -ano |
      Select-String -Pattern "LISTENING" |
      ForEach-Object {
        if ($_.Line -match ":${port}\\s+\\S+\\s+LISTENING\\s+(\\d+)") {
          $matches[1]
        }
      }
    $ids | Where-Object { $_ } | Sort-Object -Unique
  `;
  const result = runPowerShell(script);
  return result.stdout.split(/\s+/).filter((value) => /^\d+$/.test(value));
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function waitForPortToClose() {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (portPids().length === 0) {
      return true;
    }

    sleep(250);
  }

  return false;
}

function status() {
  const pids = portPids();

  if (pids.length === 0) {
    console.log(`Backend is not listening on port ${port}.`);
    return;
  }

  console.log(`Backend port ${port} is owned by PID(s): ${pids.join(", ")}`);
}

function stop() {
  const pids = portPids();

  if (pids.length === 0) {
    console.log(`No backend process is listening on port ${port}.`);
    return;
  }

  for (const pid of pids) {
    if (process.platform === "win32") {
      runPowerShell(`Stop-Process -Id ${pid} -Force -ErrorAction SilentlyContinue`);
      console.log(`Stopped PID ${pid}.`);
      continue;
    }

    try {
      process.kill(Number(pid), "SIGTERM");
      console.log(`Stopped PID ${pid}.`);
    } catch {
      try {
        process.kill(Number(pid), "SIGKILL");
        console.log(`Stopped PID ${pid}.`);
      } catch {
        console.log(`Could not stop PID ${pid}.`);
      }
    }
  }

  if (!waitForPortToClose()) {
    console.error(`Port ${port} is still busy after stopping PID(s): ${pids.join(", ")}`);
    process.exit(1);
  }
}

function start({ reload }) {
  stop();
  const args = ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", port];

  if (reload) {
    args.push("--reload");
  }

  const child = spawn(python, args, {
    cwd: backendDir,
    stdio: "inherit",
    env: { ...process.env },
  });

  child.on("exit", (code) => process.exit(code ?? 0));
}

if (command === "status") {
  status();
} else if (command === "stop") {
  stop();
} else if (command === "dev") {
  start({ reload: true });
} else if (command === "start") {
  start({ reload: false });
} else {
  console.error(`Unknown command: ${command}`);
  process.exit(1);
}
