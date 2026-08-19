# Blinkbox backend — self-hosted runtime.
# Build context is the REPO ROOT, not this directory: the backend resolves
# packages/* through npm workspaces and cannot install on its own.
#   docker build -f apps/backend/Dockerfile .
FROM node:22-bookworm-slim

ENV NODE_ENV=production \
    PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Chromium for the scraper/informer nodes, plus the fonts and libs it needs to
# render real pages rather than boxes.
RUN apt-get update && apt-get install -y --no-install-recommends \
      chromium \
      ca-certificates \
      fonts-liberation \
      fonts-noto-color-emoji \
      libnss3 libatk-bridge2.0-0 libgtk-3-0 libasound2 \
      libdrm2 libgbm1 libxkbcommon0 libxdamage1 libxfixes3 libxrandr2 \
      dumb-init \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json* ./

# Railway auto-detects this Dockerfile when the service Root Directory is
# apps/backend, which makes the context that folder. The COPYs below then
# resolve to nothing and BuildKit reports an opaque '"/apps/backend": not
# found' checksum error six steps later. Say what is actually wrong instead.
RUN node -e "if(!require('/app/package.json').workspaces){console.error('\n[blinkbox] Build context must be the repo ROOT, not apps/backend.\n  docker build -f apps/backend/Dockerfile .\n  Railway: clear the service Root Directory, or keep builder=NIXPACKS.\n');process.exit(1)}"

COPY apps/backend/package.json apps/backend/
COPY packages/nodes/package.json packages/nodes/
COPY packages/shared-types/package.json packages/shared-types/
COPY packages/triggers/package.json packages/triggers/

RUN npm ci --omit=dev --workspace apps/backend --include-workspace-root \
    || npm install --omit=dev --workspace apps/backend --include-workspace-root

COPY packages/ packages/
COPY apps/backend/ apps/backend/

RUN groupadd -r blinkbox && useradd -r -g blinkbox -m blinkbox \
    && chown -R blinkbox:blinkbox /app
USER blinkbox

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "run", "start", "--workspace", "apps/backend"]
