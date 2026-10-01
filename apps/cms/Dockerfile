FROM node:22-bookworm-slim AS base

ENV PNPM_HOME=/pnpm
ENV PATH=${PNPM_HOME}:${PATH}
RUN corepack enable && corepack prepare pnpm@10.30.0 --activate

FROM base AS dependencies
WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/cms/package.json apps/cms/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY config/eslint-config/package.json config/eslint-config/package.json
COPY config/prettier-config/package.json config/prettier-config/package.json
COPY config/vitest-config/package.json config/vitest-config/package.json

RUN pnpm install --frozen-lockfile --filter @mini-workout/cms...

FROM dependencies AS build
WORKDIR /workspace

COPY apps/cms apps/cms
COPY packages/contracts packages/contracts
COPY config config

ENV NODE_ENV=production
ENV STRAPI_TELEMETRY_DISABLED=true
RUN pnpm --filter @mini-workout/contracts build
RUN pnpm --filter @mini-workout/cms build
RUN pnpm --filter @mini-workout/cms deploy --legacy --prod /opt/cms
RUN mkdir -p /opt/cms/.strapi \
  && cp -R apps/cms/.strapi/client /opt/cms/.strapi/client \
  && cp -R apps/cms/dist /opt/cms/dist

FROM base AS runtime
WORKDIR /opt/cms

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=1337
ENV CMS_VALIDATE_RUNTIME_CONFIG=true
ENV STRAPI_TELEMETRY_DISABLED=true

COPY --from=build --chown=node:node /opt/cms ./
RUN mkdir -p .tmp public/uploads && chown -R node:node .tmp public/uploads

USER node
EXPOSE 1337

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:1337/_health').then(r=>process.exit(r.status===204?0:1)).catch(()=>process.exit(1))"]

CMD ["./node_modules/.bin/strapi", "start"]
