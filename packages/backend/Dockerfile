FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/backend/package.json packages/backend/
COPY packages/shared/package.json packages/shared/
COPY packages/ai-pipeline/package.json packages/ai-pipeline/
RUN pnpm install --frozen-lockfile --prod=false

FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/backend/node_modules ./packages/backend/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/packages/ai-pipeline/node_modules ./packages/ai-pipeline/node_modules
COPY packages/shared packages/shared
COPY packages/ai-pipeline packages/ai-pipeline
COPY packages/backend packages/backend
COPY tsconfig.base.json ./
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
RUN cd packages/shared && pnpm run build
RUN cd packages/ai-pipeline && pnpm run build
RUN cd packages/backend && pnpm run build

FROM node:22-alpine AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 backend
COPY --from=build /app/packages/backend/dist ./dist
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/shared/package.json ./packages/shared/
COPY --from=build /app/packages/ai-pipeline/dist ./packages/ai-pipeline/dist
COPY --from=build /app/packages/ai-pipeline/package.json ./packages/ai-pipeline/
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/backend/package.json ./
USER backend
ENV NODE_ENV=production
EXPOSE 4000
CMD ["node", "dist/index.js"]
