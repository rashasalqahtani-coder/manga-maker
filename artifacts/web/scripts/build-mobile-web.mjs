import { spawn } from "node:child_process";
import { rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workspaceRoot = path.resolve(webRoot, "../..");
const mobileRoot = path.resolve(workspaceRoot, "artifacts/mobile");
const outputDir = path.resolve(webRoot, "dist/public");
const clerkProxyPath = "/api/__clerk";

function normalizeDomain(value) {
  if (!value?.trim()) return "";
  const withProtocol = /^https?:\/\//i.test(value)
    ? value.trim()
    : `https://${value.trim()}`;
  return new URL(withProtocol).host;
}

function getPublicDomain() {
  return normalizeDomain(
    process.env.REPLIT_INTERNAL_APP_DOMAIN ||
      process.env.EXPO_PUBLIC_DOMAIN ||
      process.env.REPLIT_DEV_DOMAIN,
  );
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd || workspaceRoot,
      env: options.env || process.env,
      stdio: "inherit",
    });

    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(
          `${command} exited with ${signal ? `signal ${signal}` : `code ${code}`}`,
        ),
      );
    });
  });
}

const publicDomain = getPublicDomain();
const publishableKey = process.env.CLERK_PUBLISHABLE_KEY?.trim();
const configuredProxyPath = process.env.CLERK_PROXY_URL?.trim();

if (!publicDomain) {
  throw new Error("Missing deployment or development domain for Expo Web");
}

if (!publishableKey) {
  throw new Error("Missing CLERK_PUBLISHABLE_KEY for Expo Web");
}

if (configuredProxyPath && configuredProxyPath !== clerkProxyPath) {
  throw new Error(
    `Invalid CLERK_PROXY_URL: expected ${clerkProxyPath}`,
  );
}

const proxyUrl = configuredProxyPath
  ? `https://${publicDomain}${clerkProxyPath}`
  : "";

await rm(outputDir, { recursive: true, force: true });

await run(
  "pnpm",
  [
    "exec",
    "expo",
    "export",
    "--platform",
    "web",
    "--output-dir",
    outputDir,
    "--clear",
  ],
  {
    cwd: mobileRoot,
    env: {
      ...process.env,
      EXPO_PUBLIC_DOMAIN: publicDomain,
      EXPO_PUBLIC_REPL_ID: process.env.REPL_ID || "",
      EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: publishableKey,
      EXPO_PUBLIC_CLERK_PROXY_URL: proxyUrl,
    },
  },
);

console.log(
  `Expo Web exported for ${publicDomain} (${proxyUrl ? "production proxy" : "direct development auth"})`,
);

if (process.argv.includes("--serve")) {
  await run(
    "pnpm",
    [
      "exec",
      "vite",
      "preview",
      "--config",
      "vite.config.ts",
      "--host",
      "0.0.0.0",
      "--port",
      process.env.PORT || "22333",
    ],
    { cwd: webRoot },
  );
}