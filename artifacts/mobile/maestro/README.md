# Published sign-up device check

This check drives the published app in Expo Go on a physical Android device and
stops when the email verification-code screen is visible. It records only
successful request paths and statuses under `/api/__clerk`; request bodies,
headers, query strings, cookies, email, password, and code are never written.

## Device prerequisites

1. Connect a physical Android device and set `ANDROID_SERIAL`.
2. Install `adb`, Maestro, and `mitmdump` on the runner.
3. Install and trust the runner's mitmproxy CA on this dedicated test device.
4. Set `DEVICE_MITM_CA_INSTALLED=true` to acknowledge that trust is configured.
5. Set `DEPLOYMENT_URL` to the HTTPS published app URL and `EXPO_GO_URL` to the
   matching published `exps://` URL.

Run:

```sh
pnpm --filter @workspace/mobile run test:device-sign-up
```

The runner rejects emulators, binds the Expo URL to the deployment host, stores
Maestro output in memory-backed `/dev/shm`, removes it after the run, and
restores the device's previous HTTP proxy setting.