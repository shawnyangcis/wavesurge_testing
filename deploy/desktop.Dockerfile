FROM node:24.19.0-bookworm-slim
ENV DEBIAN_FRONTEND=noninteractive DISPLAY=:99 DESKTOP_PORT=8810 PROFILE_DIR=/state/browser-profile
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends chromium xvfb fluxbox x11vnc novnc websockify xdotool scrot x11-utils fonts-noto-cjk ca-certificates && rm -rf /var/lib/apt/lists/*
RUN npm install -g pnpm@11.25.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY src ./src
COPY deploy/desktop-entrypoint.sh /app/desktop-entrypoint.sh
RUN mkdir /state /tmp/.X11-unix && chmod 1777 /tmp/.X11-unix && chown node:node /state && chmod +x /app/desktop-entrypoint.sh
USER node
EXPOSE 8810 6080 6081
ENTRYPOINT ["/app/desktop-entrypoint.sh"]
