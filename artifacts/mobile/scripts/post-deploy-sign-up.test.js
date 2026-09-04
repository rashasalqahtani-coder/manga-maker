const assert = require("node:assert/strict");
const test = require("node:test");

const {
  createCredentials,
  getDeploymentUrl,
  runPostDeploySignUpCheck,
} = require("./post-deploy-sign-up");

function jsonResponse(body, url, headers = {}) {
  const response = new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json", ...headers },
  });
  Object.defineProperty(response, "url", { value: url });
  return response;
}

function textResponse(body, url, headers = {}) {
  const response = new Response(body, { status: 200, headers });
  Object.defineProperty(response, "url", { value: url });
  return response;
}

test("requires a secure published deployment URL", () => {
  assert.throws(() => getDeploymentUrl({}), /DEPLOYMENT_URL/);
  assert.throws(
    () => getDeploymentUrl({ DEPLOYMENT_URL: "http://example.com" }),
    /HTTPS/,
  );
});

test("generates unique credentials without environment secrets", () => {
  const first = createCredentials({});
  const second = createCredentials({});
  assert.notEqual(first.emailAddress, second.emailAddress);
  assert.notEqual(first.password, second.password);
  assert.match(first.emailAddress, /@example\.com$/);
});

test("checks the deployed route and completes a verified session through the proxy", async () => {
  const calls = [];
  const deploymentUrl = "https://published.example";
  const fetchImpl = async (input, init = {}) => {
    const url = input.toString();
    calls.push({ url, init });

    if (url.endsWith("/mobile/manifest")) {
      return jsonResponse(
        { launchAsset: { url: `${deploymentUrl}/mobile/build/bundle.js` } },
        url,
      );
    }
    if (url.endsWith("/mobile/build/bundle.js")) {
      return textResponse(
        `sign-up clerk-captcha ${deploymentUrl}/api/__clerk`,
        url,
      );
    }
    if (url === "https://api.clerk.com/v1/testing_tokens") {
      return jsonResponse({ token: "testing-token" }, url);
    }
    if (url.includes("/api/__clerk/v1/client?")) {
      return jsonResponse(
        { response: { id: "client_1" } },
        url,
        { "set-cookie": "__client=test-cookie; Path=/; HttpOnly" },
      );
    }
    if (url.includes("/api/__clerk/v1/client/sign_ups?")) {
      return jsonResponse({ response: { id: "signup_1" } }, url);
    }
    if (url.includes("/prepare_verification?")) {
      return jsonResponse(
        {
          response: {
            status: "missing_requirements",
            verifications: {
              email_address: { status: "unverified", strategy: "email_code" },
            },
          },
        },
        url,
      );
    }
    if (url.includes("/attempt_verification?")) {
      return jsonResponse(
        {
          response: {
            status: "complete",
            created_session_id: "session_1",
          },
        },
        url,
      );
    }
    throw new Error(`Unexpected request: ${url}`);
  };

  const result = await runPostDeploySignUpCheck({
    fetchImpl,
    env: {
      DEPLOYMENT_URL: deploymentUrl,
      CLERK_SECRET_KEY: "secret-not-logged",
    },
    credentials: {
      emailAddress: "not-logged@example.com",
      password: "not-logged-password",
    },
    verificationCode: "123456",
  });

  assert.deepEqual(result, {
    routeAvailable: true,
    bundleProxyConfigured: true,
    proxyVerified: true,
    verificationPending: true,
    sessionCreated: true,
  });
  assert.equal(calls.length, 7);
  assert.equal(
    calls.filter(({ url }) => url.includes("/api/__clerk/")).length,
    4,
  );
});