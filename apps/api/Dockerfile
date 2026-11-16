# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
WORKDIR /workspace

FROM base AS deps
COPY package.json package-lock.json nx.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
RUN npm ci --legacy-peer-deps

FROM deps AS build
COPY . .
RUN npx nx run api:build:production

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /workspace/dist/apps/api/package.json ./
COPY --from=build /workspace/dist/apps/api/package-lock.json ./
RUN npm ci --omit=dev --legacy-peer-deps
COPY --from=build /workspace/dist/apps/api ./
EXPOSE 3000
CMD ["node", "main.js"]
