FROM node:22-alpine AS base

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@11.5.0 --activate

FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --dangerously-allow-all-builds

FROM base AS build

COPY . .
COPY --from=deps /app/node_modules ./node_modules
RUN pnpm run build

FROM node:22-alpine AS runtime

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@11.5.0 --activate

COPY package.json pnpm-lock.yaml ./
COPY --from=deps /app/node_modules ./node_modules
COPY src ./src
COPY tsconfig.json ./

EXPOSE 3000

CMD ["node", "--import", "tsx", "src/index.ts"]