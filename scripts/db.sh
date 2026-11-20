#!/usr/bin/env bash
# Native PostgreSQL 16 cluster for local dev/CI-less environments (no Docker daemon needed).
# Usage: scripts/db.sh start|stop [--force]|reset [--force]|status|acquire|release|drop
# Cluster lives in $CAREPATH_DATA_ROOT/pg, port 54329, loopback only, trust auth (dev only).
# CAREPATH_DATA_ROOT defaults to .data beside the main checkout, so every git worktree shares one
# cluster, one lease directory and one lock (checkpoint C2, S1; see scripts/data-root.sh).
#
# Many workers share one cluster (checkpoint C1, section 4):
#   - Gates never call stop or reset. They source scripts/gate-env.sh, which calls `acquire`
#     with DB_LEASE_PID and CAREPATH_DB set, and `drop` plus `release` on exit.
#   - A lease is a file $CAREPATH_DATA_ROOT/pg-leases/<pid>; it is live while that process is alive.
#   - `release` stops the cluster only when no live lease remains and a lease started it.
#     A cluster started by hand with `start` is never stopped by `release`.
#   - `stop` and `reset` refuse (exit 3) while live leases exist, unless --force is given.
# All state changes happen under an exclusive flock on $CAREPATH_DATA_ROOT/pg.lock.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PGBIN="${PGBIN:-/usr/lib/postgresql/16/bin}"
PORT="${DB_PORT:-54329}"
# shellcheck source=scripts/data-root.sh
source "$ROOT/scripts/data-root.sh"
DATA_ROOT="$CAREPATH_DATA_ROOT"
PGDATA="$DATA_ROOT/pg"
LOG="$DATA_ROOT/pg.log"
# Default Debian socket dir so a bare `pg_isready -p 54329` works.
SOCK="${DB_SOCKET_DIR:-/var/run/postgresql}"
DB_NAME="${CAREPATH_DB:-carepath}"
case "$DB_NAME" in "" | *[!a-z0-9_]*) echo "db: CAREPATH_DB must match [a-z0-9_]+" >&2; exit 2 ;; esac
DB_USER="carepath"
LEASES="$DATA_ROOT/pg-leases"
LOCK="$DATA_ROOT/pg.lock"
MARKER="$LEASES/.started-by-lease"

# Postgres refuses to run as root, so run every server command as the `postgres` OS user.
if [ "$(id -u)" -eq 0 ]; then
  as_pg() { runuser -u postgres -- "$@"; }
else
  as_pg() { "$@"; }
fi

locked() {
  mkdir -p "$DATA_ROOT" "$LEASES"
  exec 9>"$LOCK"
  flock 9
}

# Prints live lease pids, removes dead ones.
live_leases() {
  local f pid
  for f in "$LEASES"/[0-9]*; do
    [ -e "$f" ] || continue
    pid="${f##*/}"
    if kill -0 "$pid" 2>/dev/null; then echo "$pid"; else rm -f "$f"; fi
  done
}

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

psql_admin() {
  as_pg "$PGBIN/psql" -h 127.0.0.1 -p "$PORT" -U postgres -v ON_ERROR_STOP=1 -qtA -d postgres "$@"
}

start_cluster() {
  prepare_dirs
  init_cluster
  if is_running; then
    return 1
  fi
  # 9>&- : the server must not inherit the lock descriptor, or it would hold the lock forever.
  as_pg "$PGBIN/pg_ctl" -D "$PGDATA" -l "$LOG" -w -t 60 \
    -o "-p $PORT -c listen_addresses=127.0.0.1 -c unix_socket_directories=$SOCK" start >/dev/null 9>&-
  return 0
}

ensure_role_and_db() {
  if [ "$(psql_admin -c "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'")" != "1" ]; then
    psql_admin -c "CREATE ROLE $DB_USER LOGIN SUPERUSER PASSWORD '$DB_USER'"
  fi
  if [ "$(psql_admin -c "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'")" != "1" ]; then
    psql_admin -c "CREATE DATABASE $DB_NAME OWNER $DB_USER"
  fi
}

stop_cluster() {
  if [ -f "$PGDATA/PG_VERSION" ] && is_running; then
    as_pg "$PGBIN/pg_ctl" -D "$PGDATA" -m fast -w stop >/dev/null
    echo "db: stopped"
  else
    echo "db: not running"
  fi
  rm -f "$MARKER"
}

# Exit 3 with the list of holders when live leases exist and --force was not given.
refuse_if_leased() {
  local force="$1" pids
  pids="$(live_leases | tr '\n' ' ')"
  if [ -n "$pids" ] && [ "$force" != "--force" ]; then
    echo "db: refusing, live leases held by pid(s): ${pids% }. Use --force to override." >&2
    exit 3
  fi
}

require_lease_pid() {
  case "${DB_LEASE_PID:-}" in
    "" | *[!0-9]*) echo "db: $1 needs DB_LEASE_PID (a live process id)" >&2; exit 2 ;;
  esac
}

cmd_start() {
  locked
  if ! start_cluster; then echo "db: already running on port $PORT"; fi
  ensure_role_and_db
  "$PGBIN/pg_isready" -h 127.0.0.1 -p "$PORT"
}

cmd_acquire() {
  require_lease_pid acquire
  locked
  live_leases >/dev/null
  if start_cluster; then
    touch "$MARKER"
    echo "db: started by lease $DB_LEASE_PID"
  fi
  ensure_role_and_db
  touch "$LEASES/$DB_LEASE_PID"
  echo "db: lease $DB_LEASE_PID acquired (database $DB_NAME)"
}

cmd_release() {
  require_lease_pid release
  locked
  rm -f "$LEASES/$DB_LEASE_PID"
  if [ -z "$(live_leases)" ] && [ -e "$MARKER" ]; then
    stop_cluster
  fi
  echo "db: lease $DB_LEASE_PID released"
}

cmd_drop() {
  if [ "$DB_NAME" = "carepath" ]; then
    echo "db: refusing to drop the reserved database carepath" >&2
    exit 2
  fi
  locked
  if ! is_running; then
    echo "db: not running; nothing to drop"
    return 0
  fi
  psql_admin -c "DROP DATABASE IF EXISTS $DB_NAME WITH (FORCE)"
  echo "db: dropped $DB_NAME"
}

cmd_stop() {
  locked
  refuse_if_leased "${1:-}"
  stop_cluster
}

cmd_reset() {
  locked
  refuse_if_leased "${1:-}"
  stop_cluster
  rm -rf "$PGDATA" "$LOG"
  start_cluster || true
  ensure_role_and_db
  "$PGBIN/pg_isready" -h 127.0.0.1 -p "$PORT"
}

case "${1:-}" in
  start) cmd_start ;;
  stop) cmd_stop "${2:-}" ;;
  reset) cmd_reset "${2:-}" ;;
  status) "$PGBIN/pg_isready" -h 127.0.0.1 -p "$PORT" ;;
  acquire) cmd_acquire ;;
  release) cmd_release ;;
  drop) cmd_drop ;;
  *)
    echo "usage: $0 start|stop [--force]|reset [--force]|status|acquire|release|drop" >&2
    exit 2
    ;;
esac
