import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

export const resolveWranglerCliPath = (cwd = resolve(".")) =>
  resolve(cwd, "node_modules", "wrangler", "bin", "wrangler.js");

export const buildWranglerInvocation = (args, options = {}) => ({
  executable: options.runtimeExecutable ?? process.execPath,
  args: [resolveWranglerCliPath(options.cwd), ...args],
});

export const isD1MigrationApplyCommand = (args) => {
  const command = args.join(" ");
  return /(?:^|\s)d1\s+migrations\s+apply(?:\s|$)/.test(command);
};

export const buildWranglerEnvironment = (args, env = process.env) => ({
  ...env,
  ...(isD1MigrationApplyCommand(args) ? { CI: "true" } : {}),
});

export const runWranglerSync = (args, options = {}) => {
  const cwd = options.cwd ?? resolve(".");
  const cliPath = resolveWranglerCliPath(cwd);
  if (!existsSync(cliPath)) {
    return {
      status: 1,
      signal: null,
      stdout: "",
      stderr: `Wrangler is not installed at ${cliPath}. Run bun install first.\n`,
      error: new Error("Local Wrangler installation not found."),
    };
  }

  const { runtimeExecutable, ...spawnOptions } = options;
  return spawnSync(runtimeExecutable ?? process.execPath, [cliPath, ...args], {
    cwd,
    shell: false,
    ...spawnOptions,
    env: buildWranglerEnvironment(args, spawnOptions.env),
  });
};
