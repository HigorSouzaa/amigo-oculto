import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev"], {
  stdio: "inherit",
  env: {
    ...process.env,
    STORAGE_DRIVER: "local",
    SESSION_SECRET: process.env.SESSION_SECRET || randomBytes(48).toString("base64url"),
  },
});
child.on("exit", code => process.exit(code ?? 1));
