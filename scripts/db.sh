#!/usr/bin/env bash
# Native PostgreSQL 16 cluster for local dev/CI-less environments (no Docker daemon needed).
# Usage: scripts/db.sh start|stop|reset|status
# Cluster lives in <repo>/.data/pg (gitignored), port 54329, loopback only, trust auth (dev only).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PGBIN="${PGBIN:-/usr/lib/postgresql/16/bin}"
PORT="${DB_PORT:-54329}"
DATA_ROOT="$ROOT/.data"
PGDATA="$DATA_ROOT/pg"
LOG="$DATA_ROOT/pg.log"
# Default Debian socket dir so a bare `pg_isready -p 54329` works.
SOCK="${DB_SOCKET_DIR:-/var/run/postgresql}"
DB_NAME="carepath"
DB_USER="carepath"

# Postgres refuses to run as root, so run every server command as the `postgres` OS user.
if [ "$(id -u)" -eq 0 ]; then
  as_pg() { runuser -u postgres -- "$@"; }
else
  as_pg() { "$@"; }
fi

is_running() { as_pg "$PGBIN/pg_ctl" -D "$PGDATA" status >/dev/null 2>&1; }

prepare_dirs() {
  mkdir -p "$DATA_ROOT" "$SOCK"
  if [ "$(id -u)" -eq 0 ]; then
    chown postgres:postgres "$DATA_ROOT" "$SOCK"
  fi
}

init_cluster() {
  if [ ! -f "$PGDATA/PG_VERSION" ]; then
    echo "db: initialising cluster at $PGDATA"
    as_pg "$PGBIN/initdb" -D "$PGDATA" -U postgres -A trust -E UTF8 --locale=C.UTF-8 >/dev/null
  fi
}

start() {
  prepare_dirs
  init_cluster
  if is_running; then
    echo "db: already running on port $PORT"
  else
    as_pg "$PGBIN/pg_ctl" -D "$PGDATA" -l "$LOG" -w -t 60 \
      -o "-p $PORT -c listen_addresses=127.0.0.1 -c unix_socket_directories=$SOCK" start >/dev/null
  fi
  # Idempotent role + database creation.
  local psql=(as_pg "$PGBIN/psql" -h 127.0.0.1 -p "$PORT" -U postgres -v ON_ERROR_STOP=1 -qtA)
  if [ "$("${psql[@]}" -d postgres -c "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'")" != "1" ]; then
    "${psql[@]}" -d postgres -c "CREATE ROLE $DB_USER LOGIN SUPERUSER PASSWORD '$DB_USER'"
  fi
  if [ "$("${psql[@]}" -d postgres -c "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'")" != "1" ]; then
    "${psql[@]}" -d postgres -c "CREATE DATABASE $DB_NAME OWNER $DB_USER"
  fi
  "$PGBIN/pg_isready" -h 127.0.0.1 -p "$PORT"
}

stop() {
  if [ -f "$PGDATA/PG_VERSION" ] && is_running; then
    as_pg "$PGBIN/pg_ctl" -D "$PGDATA" -m fast -w stop >/dev/null
    echo "db: stopped"
  else
    echo "db: not running"
  fi
}

reset() {
  stop
  rm -rf "$PGDATA" "$LOG"
  start
}

case "${1:-}" in
  start) start ;;
  stop) stop ;;
  reset) reset ;;
  status) "$PGBIN/pg_isready" -h 127.0.0.1 -p "$PORT" ;;
  *) echo "usage: $0 start|stop|reset|status" >&2; exit 2 ;;
esac
