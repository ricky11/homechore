# syntax=docker/dockerfile:1

# ---- Build the client bundle ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- Runtime image ----
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=8787

# Own /app as the non-root "node" user (already present in the base image)
# before installing, so no later chown has to copy-up and duplicate files
# across layers.
RUN chown node:node /app
USER node

# Keep only the packages the server actually imports (hono, @hono/node-server,
# multicast-dns) out of package.json before installing, so client-only
# libraries like vue/naive-ui/jspdf never end up in the runtime image -
# they're already bundled into dist/ by the build stage.
COPY --chown=node:node package.json package-lock.json ./
RUN npm pkg delete devDependencies \
      dependencies.vue \
      dependencies.pinia \
      dependencies.naive-ui \
      dependencies.jspdf \
      "dependencies.@lucide/vue" \
    && npm install --omit=dev --no-audit --no-fund \
    && npm cache clean --force

COPY --chown=node:node --from=build /app/dist ./dist
COPY --chown=node:node server ./server
COPY --chown=node:node src/data/seed.json ./src/data/seed.json

RUN mkdir -p /app/data

EXPOSE 8787
VOLUME ["/app/data"]

CMD ["node", "server/index.js"]
