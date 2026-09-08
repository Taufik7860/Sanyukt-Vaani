import { spawn, spawnSync } from "node:child_process";
import { appendFileSync, closeSync, existsSync, openSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const frontend = resolve(root, "frontend");
const python = resolve(root, ".venv", "Scripts", "python.exe");
const vite = resolve(frontend, "node_modules", "vite", "bin", "vite.js");

if (!existsSync(python)) {
  console.error(`Python backend executable not found: ${python}`);
  process.exit(1);
}
if (!existsSync(vite)) {
  console.error(`Vite executable not found: ${vite}`);
  process.exit(1);
}

const processes = [
  {
    name: "backend",
    command: python,
    args: ["-m", "uvicorn", "backend.main:app", "--host", "127.0.0.1", "--port", "8000"],
    cwd: root,
    log: resolve(root, "backend.log"),
  },
  {
    name: "frontend",
    command: process.execPath,
    args: [vite, "--host", "127.0.0.1", "--port", "5173", "--strictPort"],
    cwd: frontend,
    log: resolve(root, "frontend.log"),
  },
];

function startWindowsProcess(service) {
  const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;
  const outputLog = resolve(root, `${service.name}.out.log`);
  const errorLog = resolve(root, `${service.name}.err.log`);
  const script = [
    `$process = Start-Process -FilePath ${quote(service.command)}`,
    `-ArgumentList @(${service.args.map(quote).join(",")})`,
    `-WorkingDirectory ${quote(service.cwd)}`,
    `-RedirectStandardOutput ${quote(outputLog)}`,
    `-RedirectStandardError ${quote(errorLog)}`,
    "-WindowStyle Hidden;",
  ].join(" ");
  const result = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr || `Unable to start ${service.name}`);
  return 0;
}

for (const service of processes) {
  if (process.platform === "win32") {
    startWindowsProcess(service);
    appendFileSync(service.log, `${new Date().toISOString()} started\n`);
    console.log(`${service.name} started.`);
    continue;
  }

  const logHandle = openSync(service.log, "a");
  const child = spawn(service.command, service.args, {
    cwd: service.cwd,
    detached: true,
    stdio: ["ignore", logHandle, logHandle],
    windowsHide: false,
  });
  closeSync(logHandle);
  appendFileSync(service.log, `${new Date().toISOString()} started pid=${child.pid}\n`);
  child.unref();
  console.log(`${service.name} started (pid ${child.pid}).`);
}

console.log("Frontend: http://127.0.0.1:5173/");
console.log("Backend:  http://127.0.0.1:8000/");
