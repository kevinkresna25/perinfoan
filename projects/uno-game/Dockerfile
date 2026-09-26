# Stage 1: Build client and compile TypeScript
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY packages/server/package*.json ./packages/server/
COPY packages/client/package*.json ./packages/client/

RUN npm install

COPY . .

RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=packages/client
RUN npm run build --workspace=packages/server

# Stage 2: Minimal production runtime
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json ./
COPY packages/server/package*.json ./packages/server/
COPY packages/shared/package*.json ./packages/shared/

RUN npm install --omit=dev

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/server/dist ./packages/server/dist
COPY --from=builder /app/packages/client/dist ./packages/client/dist

EXPOSE 3000
CMD ["node", "packages/server/dist/index.js"]
