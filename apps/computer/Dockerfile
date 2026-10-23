FROM node:22-bookworm

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    bash ca-certificates curl dnsutils git iputils-ping jq less nano netcat-openbsd \
    openssh-client procps python3 python3-pip python3-venv rsync sqlite3 tini tree unzip zip \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    PIP_BREAK_SYSTEM_PACKAGES=1 \
    WORKSPACE_DIR=/workspace

WORKDIR /app
COPY server.mjs ./
RUN mkdir -p /workspace

EXPOSE 8080

# Commands leave orphaned background processes; tini reaps them so they don't pile up as zombies under node.
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "/app/server.mjs"]
