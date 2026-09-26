FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
COPY packages/server/package*.json ./packages/server/
COPY packages/client/package*.json ./packages/client/
RUN npm ci

COPY tsconfig.base.json ./
COPY packages/client ./packages/client
COPY packages/server ./packages/server

RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
COPY packages/server/package*.json ./packages/server/
RUN npm ci --omit=dev --workspace=packages/server

COPY --from=builder /app/packages/server/dist ./packages/server/dist
COPY --from=builder /app/packages/client/dist ./packages/client/dist
COPY packages/server/init.sql ./packages/server/init.sql

RUN mkdir -p /app/storage/uploads/cards

EXPOSE 3000
CMD ["node", "packages/server/dist/index.js"]
