const assert = require("node:assert/strict");
const test = require("node:test");

const {
  buildSignUpUrl,
  createInMemoryCredentials,
  hasRequiredTraffic,
  requireHttpsUrl,
  validatePublishedTarget,
} = require("./device-sign-up");

test("builds the published Expo Router sign-up deep link", () => {
  assert.equal(
    buildSignUpUrl("exps://published.example/mobile/"),
    "exps://published.example/mobile/--/(auth)/sign-up",
  );
  assert.throws(() => requireHttpsUrl("DEPLOYMENT_URL", "http://example.com"), /HTTPS/);
  assert.throws(
    () =>
      validatePublishedTarget(
        "exps://published.example",
        "exps://published.example/mobile",
      ),
    /DEPLOYMENT_URL must use HTTPS/,
  );
  assert.throws(
    () =>
      validatePublishedTarget(
        "https://published.example",
        "https://published.example/mobile",
      ),
    /EXPO_GO_URL must use EXPS/,
  );
  assert.throws(
    () =>
      validatePublishedTarget(
        "https://published.example",
        "exps://other.example/mobile",
      ),
    /DEPLOYMENT_URL host/,
  );
});

test("keeps generated signup credentials in returned memory only", () => {
  const first = createInMemoryCredentials({});
  const second = createInMemoryCredentials({});
  assert.notEqual(first.email, second.email);
  assert.notEqual(first.password, second.password);
  assert.match(first.email, /@example\.com$/);
});

test("requires the client signup and email verification proxy sequence", () => {
  assert.equal(
    hasRequiredTraffic([
      "CLERK_DEVICE_REQUEST /api/__clerk/v1/client 200",
      "CLERK_DEVICE_REQUEST /api/__clerk/v1/client/sign_ups 200",
      "CLERK_DEVICE_REQUEST /api/__clerk/v1/client/sign_ups/s_1/prepare_verification 200",
    ]),
    true,
  );
  assert.equal(
    hasRequiredTraffic([
      "CLERK_DEVICE_REQUEST /api/__clerk/v1/client 200",
      "CLERK_DEVICE_REQUEST /api/__clerk/v1/client/sign_ups 200",
    ]),
    false,
  );
  assert.equal(
    hasRequiredTraffic([
      "CLERK_DEVICE_REQUEST /api/__clerk/v1/client/sign_ups/s_1/prepare_verification 200",
    ]),
    false,
  );
});