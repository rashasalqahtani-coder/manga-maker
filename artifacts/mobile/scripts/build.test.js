const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  CLERK_PROXY_PATH,
  getProductionClerkConfig,
  verifyClerkConfigInBundle,
} = require("./build");

const domain = "example.com";
const publishableKey = "pk_test_build_contract";
const proxyUrl = `https://${domain}${CLERK_PROXY_PATH}`;

test("supported production environment derives both public bundle values", () => {
  assert.throws(
    () => getProductionClerkConfig(domain, {}),
    /Missing Clerk publishable key/,
  );

  const config = getProductionClerkConfig(domain, {
    CLERK_PUBLISHABLE_KEY: publishableKey,
  });

  assert.equal(config.publishableKey, publishableKey);
  assert.equal(config.proxyUrl, proxyUrl);
});

test("production Clerk config rejects a non-canonical proxy path", () => {
  assert.throws(
    () =>
      getProductionClerkConfig(domain, {
        CLERK_PUBLISHABLE_KEY: publishableKey,
        CLERK_PROXY_URL: "/wrong-proxy",
      }),
    /Invalid Clerk proxy URL/,
  );
});

test("production bundle contains the Clerk key and proxy URL", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "expo-clerk-build-"));
  const bundlePath = path.join(tempDir, "bundle.js");
  const config = getProductionClerkConfig(domain, {
    CLERK_PUBLISHABLE_KEY: publishableKey,
  });

  fs.writeFileSync(
    bundlePath,
    `globalThis.__config=${JSON.stringify({
      key: config.publishableKey,
      proxy: config.proxyUrl,
    })}`,
  );

  assert.doesNotThrow(() =>
    verifyClerkConfigInBundle(bundlePath, config, "ios"),
  );

  fs.writeFileSync(bundlePath, `globalThis.__config=${JSON.stringify({})}`);
  assert.throws(
    () => verifyClerkConfigInBundle(bundlePath, config, "ios"),
    /EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY, EXPO_PUBLIC_CLERK_PROXY_URL/,
  );
});

test("sign-up route renders email and password fields", () => {
  const authLayout = fs.readFileSync(
    path.join(__dirname, "..", "app", "(auth)", "_layout.tsx"),
    "utf-8",
  );
  const signUpScreen = fs.readFileSync(
    path.join(__dirname, "..", "app", "(auth)", "sign-up.tsx"),
    "utf-8",
  );

  assert.match(authLayout, /Stack\.Screen name="sign-up"/);
  assert.match(signUpScreen, /testID="sign-up-email"/);
  assert.match(signUpScreen, /testID="sign-up-password"/);
  assert.match(signUpScreen, /testID="sign-up-submit"/);
});

test("package exposes the production sign-up smoke check", () => {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf-8"),
  );
  assert.equal(
    packageJson.scripts["test:post-deploy-sign-up"],
    "node scripts/post-deploy-sign-up.js",
  );
  assert.equal(packageJson.scripts["test:build"], "node --test scripts/*.test.js");

  const productionServer = fs.readFileSync(
    path.join(__dirname, "..", "server", "serve.js"),
    "utf-8",
  );
  assert.match(productionServer, /runPostDeploySignUpCheck/);
  assert.match(productionServer, /isReady \? 200 : 503/);
  assert.match(productionServer, /REPLIT_INTERNAL_APP_DOMAIN/);
});