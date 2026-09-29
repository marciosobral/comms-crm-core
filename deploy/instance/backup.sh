#!/bin/sh
set -eu
umask 077

run_backup() {
  stamp=$(date +%Y%m%d-%H%M)
  pg_dump -h db -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc -f "/backups/db-$stamp.dump"
  age -r "$BACKUP_AGE_RECIPIENT" -o "/backups/db-$stamp.dump.age" "/backups/db-$stamp.dump"
  rm -f "/backups/db-$stamp.dump"
  tar -czf "/backups/uploads-$stamp.tar.gz" -C /data uploads
  age -r "$BACKUP_AGE_RECIPIENT" -o "/backups/uploads-$stamp.tar.gz.age" "/backups/uploads-$stamp.tar.gz"
  rm -f "/backups/uploads-$stamp.tar.gz"
  find /backups \( -name 'db-*.dump' -o -name 'db-*.dump.age' -o -name 'uploads-*.tar.gz' -o -name 'uploads-*.tar.gz.age' \) -mtime +"$BACKUP_KEEP_DAYS" -delete
  echo "backup $stamp done"
}

if [ "${1:-}" = "now" ]; then
  run_backup
  exit 0
fi

while true; do
  now=$(date +%s)
  next=$(date -d "tomorrow $BACKUP_TIME" +%s)
  today=$(date -d "today $BACKUP_TIME" +%s)
  if [ "$today" -gt "$now" ]; then next=$today; fi
  sleep $((next - now))
  run_backup || echo "backup failed" >&2
done
