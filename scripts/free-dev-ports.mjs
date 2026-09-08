import { execFileSync } from "node:child_process";
import { platform } from "node:os";

const ports = [8000, 5173, 5174, 5175];

function killWindowsListeners() {
  const output = execFileSync("netstat", ["-ano", "-p", "tcp"], { encoding: "utf8" });
  const processIds = new Set();

  for (const line of output.split(/\r?\n/)) {
    if (!line.includes("LISTENING")) continue;
    const columns = line.trim().split(/\s+/);
    const localAddress = columns[1] || "";
    const port = Number(localAddress.slice(localAddress.lastIndexOf(":") + 1));
    const processId = Number(columns.at(-1));
    if (ports.includes(port) && processId > 0) processIds.add(processId);
  }

  for (const processId of processIds) {
    try {
      execFileSync("taskkill", ["/PID", String(processId), "/T", "/F"], { stdio: "ignore" });
      console.log(`Stopped stale development process ${processId}.`);
    } catch {
      // The process may have exited between netstat and taskkill.
    }
  }
}

function killUnixListeners() {
  for (const port of ports) {
    try {
      const output = execFileSync("lsof", ["-ti", `:${port}`], { encoding: "utf8" });
      for (const processId of output.split(/\s+/).filter(Boolean)) {
        execFileSync("kill", ["-TERM", processId], { stdio: "ignore" });
        console.log(`Stopped stale development process ${processId}.`);
      }
    } catch {
      // lsof may return no process for an available port.
    }
  }
}

if (platform() === "win32") killWindowsListeners();
else killUnixListeners();
