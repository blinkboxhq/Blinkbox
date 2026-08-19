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

# This build only works with the repo root as its context: the backend
# resolves packages/* through npm workspaces. A wrong context otherwise
# surfaces as an opaque BuildKit checksum error several steps later, so name
# the context in the log and stop here instead.
RUN node -e "const p=require('/app/package.json');console.log('[blinkbox] context root package:',p.name,'workspaces:',!!p.workspaces);if(!p.workspaces){console.error('\n[blinkbox] Build context must be the repo ROOT, not apps/backend.\n  docker build -f apps/backend/Dockerfile .\n  Railway: clear the service Root Directory, or keep builder=NIXPACKS.\n');process.exit(1)}"

COPY apps/backend/package.json apps/backend/
COPY packages/nodes/package.json packages/nodes/
COPY packages/shared-types/package.json packages/shared-types/
COPY packages/triggers/package.json packages/triggers/

RUN npm ci --omit=dev --workspace apps/backend --include-workspace-root \
    || npm install --omit=dev --workspace apps/backend --include-workspace-root

# One COPY, not per-directory ones. Railway's Metal builder ships an
# incremental context snapshot, and it reports whole directories as
# '"/apps/backend": not found' even when files inside them copied fine two
# steps earlier. Copying the context wholesale sidesteps that; .dockerignore
# already keeps node_modules, .git and .env out.
COPY . .

RUN test -f apps/backend/src/index.js \
    || (echo '[blinkbox] Build context is missing apps/backend/src — the context is not the repo root.' && exit 1)

RUN groupadd -r blinkbox && useradd -r -g blinkbox -m blinkbox \
    && chown -R blinkbox:blinkbox /app
USER blinkbox

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "run", "start", "--workspace", "apps/backend"]
