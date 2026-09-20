#!/usr/bin/env bash
# Back up the Designo database and uploads into one archive, then delete old archives.
#
# Runs daily from /etc/cron.d/designo-backup on the server. Output:
#   $BACKUP_DIR/designo-<UTC timestamp>.tgz   containing designo.sqlite and uploads/
#   $BACKUP_DIR/latest.tgz                    symlink to the newest archive
#
# Backups live on the same machine as the data, so they protect against mistakes and a
# corrupted database, not against losing the server. Copy latest.tgz elsewhere too.
set -euo pipefail

dest="${BACKUP_DIR:-/opt/backups/designo}"
keep_days="${BACKUP_KEEP_DAYS:-14}"
container="designo-backend"

mkdir -p "$dest"
out="$dest/designo-$(date -u +%Y%m%d-%H%M%S).tgz"
trap 'rm -f "$out.partial"' EXIT

# The snapshot is taken inside the container with SQLite's online-backup API, which gives
# a consistent copy even while Strapi is writing. A plain `cp` could catch it mid-write.
docker exec "$container" sh -c '
  set -e
  rm -rf /tmp/backup && mkdir /tmp/backup
  node -e "
    const Database = require(\"better-sqlite3\");
    new Database(\"data/designo.sqlite\", { readonly: true })
      .backup(\"/tmp/backup/designo.sqlite\")
      .then(() => process.exit(0), (error) => { console.error(error); process.exit(1); });
  "
  cp -r public/uploads /tmp/backup/uploads
  tar czf - -C /tmp/backup .
  rm -rf /tmp/backup
' < /dev/null > "$out.partial"

mv "$out.partial" "$out"
# Relative on purpose: an absolute target would not resolve when the folder is mounted
# elsewhere (for example into a container during a restore).
ln -sfn "$(basename "$out")" "$dest/latest.tgz"
find "$dest" -name 'designo-*.tgz' -mtime +"$keep_days" -delete

echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) backup ok: $out ($(du -h "$out" | cut -f1))"
