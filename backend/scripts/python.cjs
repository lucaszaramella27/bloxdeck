const { spawnSync } = require("node:child_process");
const { existsSync } = require("node:fs");
const path = require("node:path");

let args = process.argv.slice(2);
const rootDir = path.resolve(__dirname, "..", "..");
const backendDir = path.resolve(__dirname, "..");
const localPackages = path.join(rootDir, ".python-packages");
const venvPython = process.platform === "win32"
  ? path.join(backendDir, ".venv", "Scripts", "python.exe")
  : path.join(backendDir, ".venv", "bin", "python");
const env = { ...process.env };
let cwd = backendDir;

if (args[0] === "--root") {
  cwd = rootDir;
  args = args.slice(1);
}

const useLocalPackages = existsSync(localPackages) && !existsSync(venvPython);

if (useLocalPackages) {
  env.PYTHONPATH = env.PYTHONPATH
    ? `${backendDir}${path.delimiter}${localPackages}${path.delimiter}${env.PYTHONPATH}`
    : `${backendDir}${path.delimiter}${localPackages}`;
} else {
  env.PYTHONPATH = env.PYTHONPATH ? `${backendDir}${path.delimiter}${env.PYTHONPATH}` : backendDir;
}

const candidates = [
  env.PYTHON,
  existsSync(venvPython) ? venvPython : undefined,
  "python",
  "python3",
  "py",
  "C:\\Program Files\\PostgreSQL\\18\\pgAdmin 4\\python\\python.exe",
].filter(Boolean);

function candidateArgs(candidate, commandArgs) {
  return candidate === "py" ? ["-3", ...commandArgs] : commandArgs;
}

function canRun(candidate) {
  const result = spawnSync(candidate, candidateArgs(candidate, ["-c", "import sys; print(sys.executable)"]), {
    cwd,
    env,
    stdio: "ignore",
    shell: false,
  });

  return !result.error && result.status === 0;
}

function run(candidate, commandArgs) {
  return spawnSync(candidate, commandArgs, {
    cwd,
    env,
    stdio: "inherit",
    shell: false,
  });
}

for (const candidate of candidates) {
  if (!canRun(candidate)) {
    continue;
  }

  const commandArgs = candidateArgs(candidate, args);
  const result = run(candidate, commandArgs);

  process.exit(result.status ?? 1);
}

console.error("Python was not found. Install Python or set the PYTHON environment variable.");
process.exit(1);
