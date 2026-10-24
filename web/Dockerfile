# Happy2Help web app + BFF (Next.js). Build context: repository root.
# Production defaults to H2H_MODE=gateway; the fictional persona switcher is refused unless explicitly opted in.
FROM node:22-slim AS base
WORKDIR /app
RUN corepack enable

FROM base AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY web/package.json web/
RUN pnpm install --frozen-lockfile --filter happy2help_web...
COPY web web
RUN pnpm --filter happy2help_web build

FROM base AS runtime
ENV NODE_ENV=production
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY web/package.json web/
RUN pnpm install --frozen-lockfile --prod --filter happy2help_web...
COPY --from=build /app/web/.next web/.next
COPY web/next.config.ts web/
USER node
EXPOSE 3100
CMD ["pnpm", "--filter", "happy2help_web", "start"]
