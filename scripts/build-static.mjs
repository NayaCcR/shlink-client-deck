import { cp, mkdir, rename, rm } from "fs/promises";
import { existsSync } from "fs";
import { dirname, join, relative, resolve } from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const nextCli = join(root, "node_modules", "next", "dist", "bin", "next");
const apiDir = join(root, "src", "app", "api");
const apiBackupRoot = join(root, ".next-static-api-routes");
const apiBackupDir = join(apiBackupRoot, "api");
const oldShadowBuildDir = join(root, ".next-static-build-work");

function assertInsideRoot(target) {
  const relativePath = relative(resolve(root), resolve(target));
  if (relativePath.startsWith("..") || relativePath === "" || resolve(target) === resolve(root)) {
    throw new Error(`Refusing to touch path outside project root: ${target}`);
  }
}

function runNextBuild() {
  return new Promise((resolveBuild, rejectBuild) => {
    const child = spawn(process.execPath, [nextCli, "build"], {
      cwd: root,
      stdio: "inherit",
      env: {
        ...process.env,
        NEXT_PUBLIC_APP_MODE: "static"
      }
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolveBuild();
      } else {
        rejectBuild(new Error(`next build exited with code ${code}`));
      }
    });
  });
}

async function moveApiRoutesOutOfStaticBuild() {
  assertInsideRoot(apiDir);
  assertInsideRoot(apiBackupDir);

  if (!existsSync(apiDir)) {
    return false;
  }

  if (existsSync(apiBackupDir)) {
    throw new Error(
      `Static build backup already exists at ${apiBackupDir}. Restore or remove it before building.`
    );
  }

  await mkdir(apiBackupRoot, { recursive: true });
  try {
    await rename(apiDir, apiBackupDir);
  } catch (error) {
    if (error?.code !== "EPERM" && error?.code !== "EXDEV") {
      throw error;
    }

    await cp(apiDir, apiBackupDir, {
      recursive: true,
      dereference: true
    });
    await rm(apiDir, { recursive: true, force: true });
  }
  return true;
}

async function restoreApiRoutes(moved) {
  if (!moved) {
    return;
  }

  if (existsSync(apiDir)) {
    throw new Error(`Cannot restore API routes because ${apiDir} already exists.`);
  }

  try {
    await rename(apiBackupDir, apiDir);
  } catch (error) {
    if (error?.code !== "EPERM" && error?.code !== "EXDEV") {
      throw error;
    }

    await cp(apiBackupDir, apiDir, {
      recursive: true,
      dereference: true
    });
    await rm(apiBackupDir, { recursive: true, force: true });
  }
}

assertInsideRoot(oldShadowBuildDir);
await rm(oldShadowBuildDir, { recursive: true, force: true });

const movedApiRoutes = await moveApiRoutesOutOfStaticBuild();
try {
  await runNextBuild();
} finally {
  await restoreApiRoutes(movedApiRoutes);
}
