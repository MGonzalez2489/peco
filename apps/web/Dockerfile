# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
WORKDIR /workspace

FROM base AS build
COPY package.json package-lock.json nx.json tsconfig.base.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npx nx run web:build:production

FROM nginx:1.27-alpine AS runner
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/dist/peco /tmp/peco
RUN if [ -d /tmp/peco/browser ]; then cp -r /tmp/peco/browser/. /usr/share/nginx/html/; else cp -r /tmp/peco/. /usr/share/nginx/html/; fi \
  && rm -rf /tmp/peco
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
