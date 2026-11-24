FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy prisma schema and generate client.
# DATABASE_URL is required at this step for env() resolution but the value
# is unused during code generation; runtime DATABASE_URL is set by compose.
COPY prisma/schema.prisma prisma/schema.prisma
COPY prisma/migrations prisma/migrations
RUN DATABASE_URL="file:/tmp/build.db" bunx prisma generate

# Copy source
COPY . .

# Create data directory for SQLite
RUN mkdir -p /app/data

EXPOSE 3000
CMD ["sh", "-c", "bunx prisma migrate deploy && bun run src/server.ts"]
