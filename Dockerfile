FROM node:22-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js bakes NEXT_PUBLIC_* at BUILD TIME, so these must be passed as
# Docker build args (not runtime env). Defaults point to production DNS so
# a build without --build-arg still produces a working image.
ARG NEXT_PUBLIC_API_URL=https://marketflowapi.codevertexitsolutions.com
ARG NEXT_PUBLIC_AI_API_URL=https://marketflowai.codevertexitsolutions.com
ARG NEXT_PUBLIC_AUTH_API_URL=https://sso.codevertexitsolutions.com
ARG NEXT_PUBLIC_SSO_URL=https://sso.codevertexitsolutions.com
ARG NEXT_PUBLIC_SSO_CLIENT_ID=marketflow-ui
ARG NEXT_PUBLIC_APP_URL=https://marketflow.codevertexitsolutions.com
ARG NEXT_PUBLIC_NOTIFICATIONS_URL=https://notificationsapi.codevertexitsolutions.com

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_AI_API_URL=$NEXT_PUBLIC_AI_API_URL
ENV NEXT_PUBLIC_AUTH_API_URL=$NEXT_PUBLIC_AUTH_API_URL
ENV NEXT_PUBLIC_SSO_URL=$NEXT_PUBLIC_SSO_URL
ENV NEXT_PUBLIC_SSO_CLIENT_ID=$NEXT_PUBLIC_SSO_CLIENT_ID
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_NOTIFICATIONS_URL=$NEXT_PUBLIC_NOTIFICATIONS_URL

ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm exec next build --webpack

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
