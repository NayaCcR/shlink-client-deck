import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const nextCli = join(root, "node_modules", "next", "dist", "bin", "next");

const child = spawn(process.execPath, [nextCli, "build"], {
  cwd: root,
  stdio: "inherit",
  env: {
    ...process.env,
    NEXT_PUBLIC_APP_MODE: "hosted"
  }
});

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
