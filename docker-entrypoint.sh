#!/bin/sh
set -e

# Esperar y aplicar migraciones de Prisma si se especificó DATABASE_URL
if [ -n "$DATABASE_URL" ]; then
  echo "==> S.I.G.T.E: Comprobando conexión con base de datos y aplicando migraciones..."
  MAX_RETRIES=15
  RETRY_COUNT=0
  until prisma migrate deploy || [ $RETRY_COUNT -ge $MAX_RETRIES ]; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "==> Esperando conexión con PostgreSQL... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 2
  done

  if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
    echo "==> Advertencia: No se pudieron aplicar las migraciones automáticamente. Continuando inicio..."
  else
    echo "==> Migraciones aplicadas correctamente."
  fi
fi

exec "$@"
