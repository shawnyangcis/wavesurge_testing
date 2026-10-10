#!/usr/bin/env python3
"""Record WaveSurge API contract evidence without exposing the session token.

GETs and the documented free direct-search/project creation calls are supported.
This script never confirms paid work or sends messages to creators.
"""
import argparse
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import time
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
BASE = "https://wavesurge.ai/api/v1"
EVIDENCE = ROOT / "validation" / "2026-10-09"
FREE_POSTS = {"/creator-search/requests", "/codex-chat/conversations"}


def read_token():
    token = os.environ.get("WAVESURGE_TOKEN", "")
    if not token:
        for line in (ROOT / ".env").read_text().splitlines():
            key, sep, value = line.strip().partition("=")
            if sep and key.removeprefix("export ").strip() == "WAVESURGE_TOKEN":
                token = value.strip().strip("\"'")
                break
    if not token or "\n" in token or "\r" in token:
        raise SystemExit("WAVESURGE_TOKEN is missing or invalid")
    return token


def sanitize(value, token):
    if isinstance(value, dict):
        return {
            k: "[redacted]" if any(x in k.lower() for x in
                ("password", "secret", "authorization", "cookie"))
            or ("token" in k.lower() and isinstance(v, str)
                and not k.lower().endswith("tokens"))
            else sanitize(v, token)
            for k, v in value.items()
        }
    if isinstance(value, list):
        return [sanitize(v, token) for v in value]
    if isinstance(value, str):
        return value.replace(token, "[redacted]")
    return value


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def call(method, path, label, payload=None, auth_mode="cookie"):
    if not path.startswith("/") or path.startswith("//"):
        raise SystemExit("Use an API-relative path")
    if method != "GET" and not (method == "POST" and path in FREE_POSTS):
        raise SystemExit("This verifier only allows GET and documented free POST calls")
    if not label or any(c not in "abcdefghijklmnopqrstuvwxyz0123456789-_" for c in label):
        raise SystemExit("Label must contain lowercase letters, digits, dashes or underscores")
    token = read_token()
    EVIDENCE.mkdir(parents=True, exist_ok=True)
    headers = {"Accept": "application/json",
               "User-Agent": "WaveSurge-Contract-Verification/1.0"}
    if auth_mode == "cookie":
        headers["Cookie"] = "kolagent_token=" + token
    elif auth_mode == "bearer":
        headers["Authorization"] = "Bearer " + token
    body = None if payload is None else json.dumps(payload).encode()
    if body is not None:
        headers["Content-Type"] = "application/json"
        # Save intent before the network request; retries must reuse this payload.
        (EVIDENCE / (label + "-request.json")).write_text(
            json.dumps(sanitize(payload, token), ensure_ascii=False, indent=2) + "\n")
    request = urllib.request.Request(BASE + path, data=body, headers=headers, method=method)
    start = time.monotonic()
    timestamp = dt.datetime.now(dt.timezone.utc).isoformat()
    try:
        with urllib.request.build_opener(NoRedirect()).open(request, timeout=45) as response:
            status, raw, content_type = response.status, response.read(), response.headers.get("Content-Type")
    except urllib.error.HTTPError as error:
        status, raw, content_type = error.code, error.read(), error.headers.get("Content-Type")
    except (urllib.error.URLError, TimeoutError):
        print(json.dumps({"label": label, "error": "network failure; reconcile remote state before retrying a POST"}))
        return 2
    try:
        data = json.loads(raw)
    except (ValueError, UnicodeDecodeError):
        data = {"text": raw.decode(errors="replace")}
    data = sanitize(data, token)
    if path == "/auth/me" and isinstance(data, dict) and isinstance(data.get("user"), dict):
        data["user"] = {key: value if key == "role" else "[redacted account]"
                        for key, value in data["user"].items()}
    record = {"atUtc": timestamp, "method": method, "path": path, "authMode": auth_mode,
              "status": status, "elapsedSeconds": round(time.monotonic() - start, 3),
              "contentType": content_type, "responseSha256": hashlib.sha256(raw).hexdigest(),
              "response": data}
    target = EVIDENCE / (label + ".json")
    target.write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n")
    summary = {key: record[key] for key in ("method", "path", "elapsedSeconds")}
    summary["httpStatus"] = status
    summary["file"] = str(target)
    summary["topLevel"] = list(data) if isinstance(data, dict) else type(data).__name__
    if isinstance(data, dict):
        summary["arrayLengths"] = {key: len(value) for key, value in data.items() if isinstance(value, list)}
        if "status" in data:
            summary["taskStatus"] = data["status"]
        for key in ("taskId", "code", "error", "balance"):
            if key in data:
                summary[key] = data[key]
    print(json.dumps(summary, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("method", choices=("GET", "POST"))
    parser.add_argument("path")
    parser.add_argument("label")
    parser.add_argument("--body", type=Path, help="A JSON request file; reuse it when retrying")
    parser.add_argument("--auth-mode", choices=("cookie", "bearer", "none"), default="cookie")
    args = parser.parse_args()
    raise SystemExit(call(args.method, args.path, args.label,
                          json.loads(args.body.read_text()) if args.body else None, args.auth_mode))
