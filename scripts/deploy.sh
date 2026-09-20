#!/usr/bin/env bash
# Rebuild and restart the Designo backend on the server, then wait until it is healthy.
#
# Used by .github/workflows/deploy.yml, and safe to run by hand:
#   ssh ubuntu@<server> 'bash /opt/apps/designo/scripts/deploy.sh'
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."
compose="docker compose -f docker-compose.prod.yml"

# stdin is redirected on every docker call. When this runs as `ssh host 'bash -s' <<EOF`,
# a command that reads stdin would swallow the rest of the script and still exit 0.
$compose build < /dev/null
$compose up -d < /dev/null

echo "Waiting for designo-backend to become healthy..."
status=""
for _ in $(seq 1 36); do
  status=$(docker inspect -f '{{.State.Health.Status}}' designo-backend 2>/dev/null || true)
  [ "$status" = "healthy" ] && break
  sleep 5
done

if [ "$status" != "healthy" ]; then
  echo "designo-backend is '${status:-unknown}' after 3 minutes. Last log lines:" >&2
  docker logs --tail 40 designo-backend >&2 < /dev/null
  exit 1
fi

# Remove the previous build's dangling image, but only images labelled as this project's,
# so other projects on the same host are never touched.
docker image prune -f --filter "label=org.opencontainers.image.title=designo-backend" < /dev/null > /dev/null

echo "Deployed $(git log -1 --format='%h %s')"
