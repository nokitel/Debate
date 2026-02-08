FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/frontend/package.json packages/frontend/
COPY packages/shared/package.json packages/shared/
COPY packages/backend/package.json packages/backend/
COPY packages/ai-pipeline/package.json packages/ai-pipeline/
RUN pnpm install --frozen-lockfile --prod=false

FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/frontend/node_modules ./packages/frontend/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/packages/backend/node_modules ./packages/backend/node_modules
COPY --from=deps /app/packages/ai-pipeline/node_modules ./packages/ai-pipeline/node_modules
COPY packages/shared packages/shared
COPY packages/backend packages/backend
COPY packages/ai-pipeline packages/ai-pipeline
COPY packages/frontend packages/frontend
COPY tsconfig.base.json ./
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
RUN cd packages/frontend && pnpm run build

FROM node:22-alpine AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs
COPY --from=build /app/packages/frontend/.next/standalone ./
COPY --from=build /app/packages/frontend/.next/static ./packages/frontend/.next/static
COPY --from=build /app/packages/frontend/public ./packages/frontend/public
USER nextjs
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
CMD ["node", "packages/frontend/server.js"]
