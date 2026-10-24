# Happy2Help erxes plugin API (startPlugin). Registers with the erxes gateway through Redis.
FROM node:22-slim AS base
WORKDIR /app
RUN corepack enable

FROM base AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY api/package.json api/
RUN pnpm install --frozen-lockfile --filter happy2help_api...
COPY erxes.json ./
COPY api api
RUN pnpm --filter happy2help_api build

FROM base AS runtime
ENV NODE_ENV=production
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY api/package.json api/
RUN pnpm install --frozen-lockfile --prod --filter happy2help_api...
COPY erxes.json ./
COPY --from=build /app/api/dist api/dist
USER node
EXPOSE 3399
HEALTHCHECK --interval=15s --timeout=5s --retries=5 CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3399)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "api/dist/main.js"]
