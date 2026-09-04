const assert = require("node:assert/strict");
const { spawn, spawnSync } = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const CLIENT_PATH = "/api/__clerk/v1/client";
const SIGN_UP_PATH = "/api/__clerk/v1/client/sign_ups";
const PREPARE_VERIFICATION_PATH =
  /^\/api\/__clerk\/v1\/client\/sign_ups\/[^/]+\/prepare_verification$/;

function requireUrlProtocol(name, value, protocol) {
  if (!value?.trim()) throw new Error(`${name} is required`);
  const url = new URL(value);
  if (url.protocol !== protocol) {
    throw new Error(`${name} must use ${protocol.replace(":", "").toUpperCase()}`);
  }
  return url;
}

function requireHttpsUrl(name, value) {
  return requireUrlProtocol(name, value, "https:");
}

function createInMemoryCredentials(env = process.env) {
  const domain = env.SIGN_UP_SMOKE_EMAIL_DOMAIN?.trim() || "example.com";
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) {
    throw new Error("SIGN_UP_SMOKE_EMAIL_DOMAIN must be a valid domain");
  }
  return {
    email: `device-smoke-${crypto.randomBytes(12).toString("hex")}@${domain}`,
    password: `N3b!${crypto.randomBytes(24).toString("base64url")}`,
  };
}

function buildSignUpUrl(value) {
  const url = requireUrlProtocol("EXPO_GO_URL", value, "exps:");
  const base = url.toString().replace(/\/+$/, "");
  return `${base}/--/(auth)/sign-up`;
}

function validatePublishedTarget(deploymentValue, expoValue) {
  const deploymentUrl = requireHttpsUrl("DEPLOYMENT_URL", deploymentValue);
  const expoUrl = requireUrlProtocol("EXPO_GO_URL", expoValue, "exps:");
  if (deploymentUrl.host !== expoUrl.host) {
    throw new Error("EXPO_GO_URL must target the DEPLOYMENT_URL host");
  }
  return { deploymentUrl, signUpUrl: buildSignUpUrl(expoValue) };
}

function ensureCommand(command) {
  const result = spawnSync(command, ["--version"], { encoding: "utf8" });
  if (result.error?.code === "ENOENT") {
    throw new Error(`${command} is required for the physical-device test`);
  }
}

function adb(serial, args, options = {}) {
  const result = spawnSync("adb", ["-s", serial, ...args], {
    encoding: "utf8",
    ...options,
  });
  if (result.status !== 0) {
    throw new Error(`Android device command failed: ${args[0]}`);
  }
  return result.stdout.trim();
}

function getPhysicalAndroidDevice(env = process.env) {
  const serial = env.ANDROID_SERIAL?.trim();
  if (!serial) throw new Error("ANDROID_SERIAL is required");
  const state = adb(serial, ["get-state"]);
  if (state !== "device") throw new Error("The selected Android device is unavailable");
  const emulator = adb(serial, ["shell", "getprop", "ro.kernel.qemu"]);
  assert.notEqual(emulator, "1", "The sign-up check requires a physical Android device");
  return serial;
}

function hasRequiredTraffic(lines) {
  const paths = lines
    .filter((line) => line.startsWith("CLERK_DEVICE_REQUEST "))
    .map((line) => line.split(" ")[1]);
  return (
    paths.includes(CLIENT_PATH) &&
    paths.includes(SIGN_UP_PATH) &&
    paths.some((observed) => PREPARE_VERIFICATION_PATH.test(observed))
  );
}

async function waitForExit(child, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error("Device sign-up automation timed out"));
    }, timeoutMs);
    child.once("exit", (code) => {
      clearTimeout(timer);
      resolve(code);
    });
    child.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

async function runDeviceSignUp({ env = process.env } = {}) {
  const { deploymentUrl, signUpUrl } = validatePublishedTarget(
    env.DEPLOYMENT_URL,
    env.EXPO_GO_URL,
  );
  if (env.DEVICE_MITM_CA_INSTALLED !== "true") {
    throw new Error(
      "Set DEVICE_MITM_CA_INSTALLED=true only after trusting the mitmproxy CA on the test device",
    );
  }
  ensureCommand("adb");
  ensureCommand("maestro");
  ensureCommand("mitmdump");

  const serial = getPhysicalAndroidDevice(env);
  const credentials = createInMemoryCredentials(env);
  const captureLines = [];
  const captureScript = path.join(__dirname, "clerk-device-capture.py");
  const flow = path.join(__dirname, "..", "maestro", "published-sign-up.yaml");
  const proxyPort = env.DEVICE_PROXY_PORT?.trim() || "8080";
  const maestroOutputDir = `/dev/shm/nebola-device-sign-up-${crypto.randomBytes(8).toString("hex")}`;
  const previousProxy = adb(serial, [
    "shell",
    "settings",
    "get",
    "global",
    "http_proxy",
  ]);

  let proxy;
  let reverseCreated = false;
  let proxyChanged = false;
  const collect = (chunk) => {
    for (const line of chunk.toString().split(/\r?\n/)) {
      if (line.startsWith("CLERK_DEVICE_REQUEST ")) captureLines.push(line);
    }
  };

  try {
    adb(serial, ["reverse", `tcp:${proxyPort}`, `tcp:${proxyPort}`]);
    reverseCreated = true;
    adb(serial, [
      "shell",
      "settings",
      "put",
      "global",
      "http_proxy",
      `127.0.0.1:${proxyPort}`,
    ]);
    proxyChanged = true;
    proxy = spawn(
      "mitmdump",
      [
        "--listen-host",
        "127.0.0.1",
        "--listen-port",
        proxyPort,
        "-q",
        "-s",
        captureScript,
      ],
      {
        stdio: ["ignore", "pipe", "pipe"],
        env: { ...env, DEVICE_TEST_DEPLOYMENT_HOST: deploymentUrl.host },
      },
    );
    proxy.stdout.on("data", collect);
    proxy.stderr.on("data", collect);
    await new Promise((resolve) => setTimeout(resolve, 1_000));
    const maestro = spawn(
      "maestro",
      ["test", "--test-output-dir", maestroOutputDir, flow],
      {
      stdio: ["ignore", "ignore", "pipe"],
      env: {
        ...env,
        ANDROID_SERIAL: serial,
        EXPO_GO_SIGN_UP_URL: signUpUrl,
        SIGN_UP_EMAIL: credentials.email,
        SIGN_UP_PASSWORD: credentials.password,
      },
      },
    );
    const exitCode = await waitForExit(maestro, 180_000);
    if (exitCode !== 0) {
      throw new Error("Expo Go automation failed; inspect redacted runner diagnostics");
    }
    if (!hasRequiredTraffic(captureLines)) {
      throw new Error(
        "Expo Go reached verification, but the captured client traffic did not prove the Clerk proxy sequence",
      );
    }
    return { physicalDevice: true, verificationScreenReached: true, proxyVerified: true };
  } finally {
    proxy?.kill("SIGTERM");
    fs.rmSync(maestroOutputDir, { recursive: true, force: true });
    if (proxyChanged) {
      if (previousProxy && previousProxy !== "null" && previousProxy !== ":0") {
        adb(serial, ["shell", "settings", "put", "global", "http_proxy", previousProxy]);
      } else {
        adb(serial, ["shell", "settings", "put", "global", "http_proxy", ":0"]);
      }
    }
    if (reverseCreated) {
      adb(serial, ["reverse", "--remove", `tcp:${proxyPort}`]);
    }
  }
}

async function main() {
  await runDeviceSignUp();
  console.log(
    "Physical-device sign-up check passed: Expo Go reached email verification through /api/__clerk",
  );
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`Physical-device sign-up check failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  buildSignUpUrl,
  createInMemoryCredentials,
  hasRequiredTraffic,
  requireHttpsUrl,
  requireUrlProtocol,
  runDeviceSignUp,
  validatePublishedTarget,
};