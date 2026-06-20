import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";

import { loadLinkConsoleConfig } from "./load-link-console-config.mjs";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
process.chdir(root);

const { argv } = await loadLinkConsoleConfig();
const nextCli = join(root, "node_modules", "next", "dist", "bin", "next");

const child = spawn(process.execPath, [nextCli, "start", ...argv], {
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
