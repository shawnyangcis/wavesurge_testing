#!/bin/sh
set -eu
mkdir -p /state/browser-profile /state/downloads
rm -f /tmp/.X99-lock /tmp/.X11-unix/X99
# Compose guarantees a single writer; the previous container has stopped.
rm -f "$PROFILE_DIR/SingletonLock" "$PROFILE_DIR/SingletonCookie" "$PROFILE_DIR/SingletonSocket"
Xvfb :99 -screen 0 1440x900x24 -nolisten tcp &
xvfb_pid=$!
while ! xdpyinfo -display :99 >/dev/null 2>&1; do sleep 0.1; done
fluxbox >/tmp/fluxbox.log 2>&1 &
x11vnc -display :99 -localhost -forever -shared -nopw -viewonly -rfbport 5900 >/tmp/vnc-view.log 2>&1 &
x11vnc -display :99 -localhost -forever -shared -nopw -rfbport 5901 >/tmp/vnc-control.log 2>&1 &
websockify --web=/usr/share/novnc 6080 localhost:5900 >/tmp/novnc-view.log 2>&1 &
websockify --web=/usr/share/novnc 6081 localhost:5901 >/tmp/novnc-control.log 2>&1 &
while [ ! -r /run/studio-secrets/desktop-token ]; do sleep 0.2; done
node src/desktop/main.ts &
desktop_pid=$!
trap 'kill -TERM "$desktop_pid"; wait "$desktop_pid" || true; exit 0' TERM INT
trap 'kill -TERM "$xvfb_pid" 2>/dev/null || true; rm -f /tmp/.X99-lock /tmp/.X11-unix/X99' EXIT
wait "$desktop_pid"
