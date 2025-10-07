# syntax=docker/dockerfile:1.6

FROM node:20-alpine AS base
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

RUN npm install

COPY . .

RUN npm run api:build

FROM node:20-alpine AS production
ENV NODE_ENV=production
WORKDIR /app

COPY --from=base /app /app

RUN npm prune --omit=dev

WORKDIR /app/apps/api
EXPOSE 4000
CMD ["npm", "run", "start:prod"]
