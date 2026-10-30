FROM docker.io/library/node:24-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --legacy-peer-deps --no-audit --no-fund
COPY tsconfig.json rig.json ./
COPY src ./src
COPY runs ./runs
COPY scripts ./scripts
USER node
EXPOSE 8080
CMD ["sh", "-c", "./node_modules/.bin/tsx scripts/export-preview.ts /tmp/preview.html && node scripts/serve-preview.mjs"]
