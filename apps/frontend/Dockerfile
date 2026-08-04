# Blinkbox frontend — self-hosted static build served by nginx.
# Build context is the REPO ROOT (npm workspaces):
#   docker build -f apps/frontend/Dockerfile .
#
# Vite inlines env at build time, so VITE_* values are build args, not runtime
# env. Changing the API URL means rebuilding this image.
FROM node:22-bookworm-slim AS build

ARG VITE_API_URL=http://localhost:3000
ARG VITE_SELF_HOSTED=true
ARG VITE_GOOGLE_CLIENT_ID=
ENV VITE_API_URL=$VITE_API_URL \
    VITE_SELF_HOSTED=$VITE_SELF_HOSTED \
    VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID

WORKDIR /app

COPY package.json package-lock.json* ./
COPY apps/frontend/package.json apps/frontend/
COPY packages/nodes/package.json packages/nodes/
COPY packages/shared-types/package.json packages/shared-types/
COPY packages/triggers/package.json packages/triggers/

RUN npm ci --workspace apps/frontend --include-workspace-root \
    || npm install --workspace apps/frontend --include-workspace-root

COPY packages/ packages/
COPY apps/frontend/ apps/frontend/

RUN npm run build --workspace apps/frontend

FROM nginx:1.27-alpine
COPY --from=build /app/apps/frontend/dist /usr/share/nginx/html
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
