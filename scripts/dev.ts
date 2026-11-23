/**
 * npm run dev
 *
 * 1. Builds the content index once (invalid files are reported but never block the server).
 * 2. Watches data/ and schemas/ and rebuilds on every change, so dropping a new
 *    batch file into data/questions/<difficulty>/ makes it appear after a page reload.
 * 3. Starts `next dev`.
 */
import { spawn } from "node:child_process";
import { watch, existsSync } from "node:fs";
import path from "node:path";
import { buildContent } from "./build-content-index";

const root = process.cwd();
const watchTargets = ["data", "schemas"].map((dir) => path.join(root, dir)).filter((dir) => existsSync(dir));

let timer: NodeJS.Timeout | undefined;
let building = false;
let queued = false;

async function rebuild() {
  if (building) {
    queued = true;
    return;
  }
  building = true;
  try {
    await buildContent({ quiet: true });
  } catch (error) {
    console.error("[content] build failed:", error instanceof Error ? error.message : error);
  } finally {
    building = false;
    if (queued) {
      queued = false;
      void rebuild();
    }
  }
}

function schedule() {
  clearTimeout(timer);
  timer = setTimeout(() => void rebuild(), 250);
}

async function main() {
  await rebuild();

  const watchers = watchTargets.map((target) =>
    watch(target, { recursive: true }, (_event, filename) => {
      if (filename && /\.json$/i.test(filename.toString())) {
        console.log(`[content] change detected: ${filename.toString().replace(/\\/g, "/")}`);
        schedule();
      }
    }),
  );

  const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");
  const child = spawn(process.execPath, [nextBin, "dev", ...process.argv.slice(2)], { stdio: "inherit", cwd: root });

  const shutdown = (code: number) => {
    watchers.forEach((watcher) => watcher.close());
    child.kill();
    process.exit(code);
  };
  child.on("exit", (code) => shutdown(code ?? 0));
  process.on("SIGINT", () => shutdown(0));
  process.on("SIGTERM", () => shutdown(0));
}

void main();
