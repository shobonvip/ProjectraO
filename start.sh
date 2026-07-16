#!/bin/sh

# 1. コンテナ外部からのアクセスを許可する (Next.js特有の502エラー対策)
export HOSTNAME="0.0.0.0"
export PORT=80

# 2. Next.js / Prisma Client 実行用に DATABASE_URL を OS レベルで合成
export DATABASE_URL="mysql://${NS_MARIADB_USER}:${NS_MARIADB_PASSWORD}@${NS_MARIADB_HOSTNAME}:${NS_MARIADB_PORT}/${NS_MARIADB_DATABASE}"

# 3. Next.js を起動
exec npm run start
