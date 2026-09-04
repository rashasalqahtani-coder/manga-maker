import os

from mitmproxy import http

CLERK_PREFIX = "/api/__clerk/"
EXPECTED_HOST = os.environ["DEVICE_TEST_DEPLOYMENT_HOST"]


def response(flow: http.HTTPFlow) -> None:
    path = flow.request.path.split("?", 1)[0]
    if (
        flow.request.pretty_host == EXPECTED_HOST
        and path.startswith(CLERK_PREFIX)
        and 200 <= flow.response.status_code < 300
    ):
        print(f"CLERK_DEVICE_REQUEST {path} {flow.response.status_code}", flush=True)