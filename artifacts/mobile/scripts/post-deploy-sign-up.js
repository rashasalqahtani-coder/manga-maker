const assert = require("node:assert/strict");
const crypto = require("node:crypto");

const CLERK_PROXY_PATH = "/api/__clerk";
const MOBILE_PATH = "/mobile";

function getDeploymentUrl(env = process.env) {
  const value = env.DEPLOYMENT_URL?.trim();
  if (!value) {
    throw new Error("Set DEPLOYMENT_URL to the published app URL");
  }

  const url = new URL(value);
  if (url.protocol !== "https:") {
    throw new Error("DEPLOYMENT_URL must use HTTPS");
  }
  return url;
}

function createCredentials(env = process.env) {
  const domain = env.SIGN_UP_SMOKE_EMAIL_DOMAIN?.trim() || "example.com";
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) {
    throw new Error("SIGN_UP_SMOKE_EMAIL_DOMAIN must be a valid domain");
  }

  const suffix = crypto.randomBytes(12).toString("hex");
  return {
    emailAddress: `signup-smoke-${suffix}@${domain}`,
    password: `N3b!${crypto.randomBytes(24).toString("base64url")}`,
  };
}

async function createTemporaryMailbox(fetchImpl) {
  const domainsResponse = await fetchImpl("https://api.mail.tm/domains?page=1");
  if (!domainsResponse.ok) throw new Error("Could not allocate a test mailbox");
  const domains = await domainsResponse.json();
  const domain = domains["hydra:member"]?.find(
    (entry) => entry.isActive && !entry.isPrivate,
  )?.domain;
  if (!domain) throw new Error("No temporary test mailbox domain is available");

  const credentials = createCredentials({ SIGN_UP_SMOKE_EMAIL_DOMAIN: domain });
  const accountResponse = await fetchImpl("https://api.mail.tm/accounts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      address: credentials.emailAddress,
      password: credentials.password,
    }),
  });
  if (!accountResponse.ok) throw new Error("Could not create a test mailbox");
  const account = await accountResponse.json();
  const tokenResponse = await fetchImpl("https://api.mail.tm/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      address: credentials.emailAddress,
      password: credentials.password,
    }),
  });
  if (!tokenResponse.ok) throw new Error("Could not access the test mailbox");
  const tokenPayload = await tokenResponse.json();
  if (!account.id || !tokenPayload.token) {
    throw new Error("Temporary mailbox returned an invalid response");
  }
  return { ...credentials, accountId: account.id, token: tokenPayload.token };
}

async function waitForVerificationCode(fetchImpl, mailbox) {
  const headers = { Authorization: `Bearer ${mailbox.token}` };
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const response = await fetchImpl("https://api.mail.tm/messages?page=1", {
      headers,
    });
    if (!response.ok) throw new Error("Could not read the test mailbox");
    const list = await response.json();
    const id = list["hydra:member"]?.[0]?.id;
    if (id) {
      const messageResponse = await fetchImpl(
        `https://api.mail.tm/messages/${encodeURIComponent(id)}`,
        { headers },
      );
      if (!messageResponse.ok) throw new Error("Could not read the verification email");
      const message = await messageResponse.json();
      const content = [message.subject, message.text, message.html]
        .flat()
        .filter(Boolean)
        .join(" ");
      const code = content.match(/\b(\d{6})\b/)?.[1];
      if (code) return code;
    }
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
  throw new Error("Timed out waiting for the verification email");
}

async function deleteTemporaryMailbox(fetchImpl, mailbox) {
  if (!mailbox) return;
  await fetchImpl(
    `https://api.mail.tm/accounts/${encodeURIComponent(mailbox.accountId)}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${mailbox.token}` },
    },
  ).catch(() => {});
}

function getSetCookie(headers) {
  if (typeof headers.getSetCookie === "function") {
    return headers.getSetCookie().map((value) => value.split(";")[0]).join("; ");
  }
  return (headers.get("set-cookie") || "").split(";")[0];
}

async function clerkRequest(fetchImpl, url, init, expectedProxyOrigin) {
  const response = await fetchImpl(url, {
    redirect: "error",
    ...init,
  });

  assert.equal(
    new URL(response.url).origin + new URL(response.url).pathname.split("/v1/")[0],
    expectedProxyOrigin,
    "Clerk request escaped the production /api/__clerk proxy",
  );

  if (!response.ok) {
    throw new Error(
      `Clerk proxy request failed with HTTP ${response.status}; run this check with the published app's production Clerk environment`,
    );
  }
  return response;
}

async function createTestingToken(fetchImpl, secretKey) {
  if (!secretKey?.trim()) {
    throw new Error("CLERK_SECRET_KEY is required for the post-deploy sign-up check");
  }

  const response = await fetchImpl("https://api.clerk.com/v1/testing_tokens", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: "{}",
    redirect: "error",
  });
  if (!response.ok) {
    throw new Error(`Could not create a Clerk testing token (HTTP ${response.status})`);
  }

  const payload = await response.json();
  if (!payload.token) throw new Error("Clerk returned an invalid testing token");
  return payload.token;
}

async function verifyPublishedSignUpRoute(
  fetchImpl,
  routeBaseUrl,
  deploymentUrl = routeBaseUrl,
) {
  const manifestUrl = new URL(`${MOBILE_PATH}/manifest`, routeBaseUrl);
  const manifestResponse = await fetchImpl(manifestUrl, {
    headers: { "expo-platform": "ios" },
    redirect: "error",
  });
  if (!manifestResponse.ok) {
    throw new Error(`Published Expo manifest failed with HTTP ${manifestResponse.status}`);
  }

  const manifest = await manifestResponse.json();
  const bundleUrl = manifest?.launchAsset?.url;
  if (!bundleUrl) {
    throw new Error("Published Expo manifest has an invalid launch bundle URL");
  }

  const bundleFetchUrl = new URL(new URL(bundleUrl).pathname, routeBaseUrl);
  const bundleResponse = await fetchImpl(bundleFetchUrl, { redirect: "error" });
  if (!bundleResponse.ok) {
    throw new Error(`Published Expo bundle failed with HTTP ${bundleResponse.status}`);
  }
  const bundle = await bundleResponse.text();
  if (!bundle.includes("sign-up") || !bundle.includes("clerk-captcha")) {
    throw new Error("Published Expo bundle does not contain the sign-up route");
  }
  const expectedProxyUrl = `${deploymentUrl.origin}${CLERK_PROXY_PATH}`;
  if (!bundle.includes(expectedProxyUrl)) {
    throw new Error("Published Expo bundle is not configured to use /api/__clerk");
  }
}

async function runPostDeploySignUpCheck({
  fetchImpl = fetch,
  env = process.env,
  credentials,
  verificationCode,
  routeBaseUrl,
} = {}) {
  const deploymentUrl = getDeploymentUrl(env);
  await verifyPublishedSignUpRoute(
    fetchImpl,
    routeBaseUrl ? new URL(routeBaseUrl) : deploymentUrl,
    deploymentUrl,
  );
  let mailbox;
  if (!credentials) {
    mailbox = await createTemporaryMailbox(fetchImpl);
    credentials = mailbox;
  }

  const proxyOrigin = `${deploymentUrl.origin}${CLERK_PROXY_PATH}`;
  const testingToken = await createTestingToken(fetchImpl, env.CLERK_SECRET_KEY);
  const withTestingToken = (pathname) => {
    const url = new URL(`${CLERK_PROXY_PATH}${pathname}`, deploymentUrl);
    url.searchParams.set("__clerk_testing_token", testingToken);
    return url;
  };
  const commonHeaders = {
    Origin: deploymentUrl.origin,
    "Content-Type": "application/x-www-form-urlencoded",
  };

  try {
    const clientResponse = await clerkRequest(
      fetchImpl,
      withTestingToken("/v1/client"),
      { headers: { Origin: deploymentUrl.origin } },
      proxyOrigin,
    );
    const cookie = getSetCookie(clientResponse.headers);
    if (!cookie) throw new Error("Clerk proxy did not establish a client cookie");

    const signUpResponse = await clerkRequest(
      fetchImpl,
      withTestingToken("/v1/client/sign_ups"),
      {
        method: "POST",
        headers: { ...commonHeaders, Cookie: cookie },
        body: new URLSearchParams({
          email_address: credentials.emailAddress,
          password: credentials.password,
        }),
      },
      proxyOrigin,
    );
    const signUpPayload = await signUpResponse.json();
    const signUp = signUpPayload.response || signUpPayload;
    if (!signUp.id) throw new Error("Clerk did not create the sign-up attempt");

    const verificationResponse = await clerkRequest(
      fetchImpl,
      withTestingToken(
        `/v1/client/sign_ups/${encodeURIComponent(signUp.id)}/prepare_verification`,
      ),
      {
        method: "POST",
        headers: { ...commonHeaders, Cookie: cookie },
        body: new URLSearchParams({ strategy: "email_code" }),
      },
      proxyOrigin,
    );
    const verificationPayload = await verificationResponse.json();
    const pendingSignUp = verificationPayload.response || verificationPayload;
    const emailVerification = pendingSignUp.verifications?.email_address;
    if (
      pendingSignUp.status !== "missing_requirements" ||
      emailVerification?.status !== "unverified" ||
      emailVerification?.strategy !== "email_code"
    ) {
      throw new Error("Clerk sign-up did not reach the email verification step");
    }

    const code =
      verificationCode || (await waitForVerificationCode(fetchImpl, mailbox));
    const attemptResponse = await clerkRequest(
      fetchImpl,
      withTestingToken(
        `/v1/client/sign_ups/${encodeURIComponent(signUp.id)}/attempt_verification`,
      ),
      {
        method: "POST",
        headers: { ...commonHeaders, Cookie: cookie },
        body: new URLSearchParams({ strategy: "email_code", code }),
      },
      proxyOrigin,
    );
    const attemptPayload = await attemptResponse.json();
    const completeSignUp = attemptPayload.response || attemptPayload;
    if (
      completeSignUp.status !== "complete" ||
      !completeSignUp.created_session_id
    ) {
      throw new Error("Clerk did not complete the sign-up session");
    }

    return {
      routeAvailable: true,
      bundleProxyConfigured: true,
      proxyVerified: true,
      verificationPending: true,
      sessionCreated: true,
    };
  } finally {
    await deleteTemporaryMailbox(fetchImpl, mailbox);
  }
}

async function main() {
  await runPostDeploySignUpCheck();
  console.log("Post-deploy sign-up check passed: Clerk created a verified session through the proxy");
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`Post-deploy sign-up check failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  CLERK_PROXY_PATH,
  createCredentials,
  createTemporaryMailbox,
  createTestingToken,
  getDeploymentUrl,
  runPostDeploySignUpCheck,
  verifyPublishedSignUpRoute,
};